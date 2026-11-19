import { packBlob, runMigration, STORAGE_VERSION } from './blob'
import { patchKeyed, removeKeyedScope } from './patch'

import type { MigrationConfig } from './blob'
import type { AmbientAdapter } from '../provider'
import type { Keyed, SourcePort } from '../types'

export const INDEXED_DB_SOURCE = 'indexedDB'
export const DEFAULT_IDB_KEY = 'state'
export type IndexedDbAdapterOptions = MigrationConfig & {
	dbName?: string
	storeName?: string
	storageKey?: string
	factory?: IDBFactory
}

function request<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => {
			resolve(req.result)
		}
		req.onerror = () => {
			reject(req.error ?? new Error('IndexedDB request failed'))
		}
	})
}

function complete(tx: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => {
			resolve()
		}
		tx.onerror = tx.onabort = () => {
			reject(tx.error ?? new Error('IndexedDB transaction failed'))
		}
	})
}

type DatabaseManager = {
	run<T>(storeName: string, operation: (db: IDBDatabase) => Promise<T>): Promise<T>
}

// Schema upgrades must coordinate all ports using the database, not just one storageKey.
const managers = new WeakMap<IDBFactory, Map<string, DatabaseManager>>()
const factoryIds = new WeakMap<IDBFactory, number>()
let nextFactoryId = 0

function databaseManager(factory: IDBFactory, dbName: string): DatabaseManager {
	let databases = managers.get(factory)
	if (!databases) {
		databases = new Map()
		managers.set(factory, databases)
	}
	const existing = databases.get(dbName)
	if (existing) return existing
	let connection: IDBDatabase | null = null
	let tail: Promise<unknown> = Promise.resolve()

	function open(storeName: string, version?: number): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const opening = version === undefined ? factory.open(dbName) : factory.open(dbName, version)
			let settled = false
			opening.onupgradeneeded = () => {
				if (settled) {
					opening.transaction?.abort()
					return
				}
				if (!opening.result.objectStoreNames.contains(storeName)) opening.result.createObjectStore(storeName)
			}
			opening.onblocked = () => {
				settled = true
				reject(new Error(`IndexedDB upgrade blocked for database "${dbName}"`))
			}
			opening.onerror = () => {
				if (settled) return
				settled = true
				reject(opening.error ?? new Error('IndexedDB open failed'))
			}
			opening.onsuccess = () => {
				const db = opening.result
				if (settled) {
					db.close()
					return
				}
				settled = true
				db.onversionchange = () => {
					db.close()
					if (connection === db) connection = null
				}
				db.onclose = () => {
					if (connection === db) connection = null
				}
				resolve(db)
			}
		})
	}

	async function ensureStore(storeName: string): Promise<IDBDatabase> {
		connection ??= await open(storeName)
		while (!connection.objectStoreNames.contains(storeName)) {
			const nextVersion = connection.version + 1
			connection.close()
			connection = null
			try {
				connection = await open(storeName, nextVersion)
			} catch (error) {
				// An external schema upgrade may win between discovering and requesting the version.
				if (!(error instanceof Error) || error.name !== 'VersionError') throw error
				connection = await open(storeName)
			}
		}
		return connection
	}

	const manager: DatabaseManager = {
		run<T>(storeName: string, operation: (db: IDBDatabase) => Promise<T>): Promise<T> {
			// Keep creation of the transaction inside this critical section: no other port can close
			// the connection for an upgrade between awaiting a database and starting a transaction.
			const result = tail.then(async () => operation(await ensureStore(storeName)))
			tail = result.catch(() => undefined)
			return result
		},
	}
	databases.set(dbName, manager)
	return manager
}

export function createIndexedDbPort(options: IndexedDbAdapterOptions = {}): SourcePort {
	const dbName = options.dbName ?? 'ez-kit'
	const storeName = options.storeName ?? 'persist'
	const storageKey = options.storageKey ?? DEFAULT_IDB_KEY
	const version = options.version ?? STORAGE_VERSION
	const factory = options.factory ?? (typeof indexedDB === 'undefined' ? null : indexedDB)
	if (factory && !factoryIds.has(factory)) factoryIds.set(factory, ++nextFactoryId)
	const manager = factory ? databaseManager(factory, dbName) : null

	function unavailable(): void {
		if (typeof window !== 'undefined') throw new Error('IndexedDB is unavailable')
	}

	async function mutate(transform: (current: Keyed) => Keyed): Promise<void> {
		if (!manager) {
			unavailable()
			return
		}
		await manager.run(storeName, async (db) => {
			const tx = db.transaction(storeName, 'readwrite')
			const done = complete(tx)
			void done.catch(() => undefined)
			try {
				const store = tx.objectStore(storeName)
				const stored = await request<unknown>(store.get(storageKey))
				const next = transform(runMigration(stored, options).keyed)
				write(store, next)
				await done
			} catch (error) {
				try {
					tx.abort()
				} catch {
					/* The failed transaction may already be closed. */
				}
				throw error
			}
		})
	}
	function write(store: IDBObjectStore, values: Keyed): void {
		if (values.size) store.put(packBlob(values, version), storageKey)
		else store.delete(storageKey)
	}
	return {
		capabilities: { recordVersions: true },
		identity: `indexedDB:${factory ? String(factoryIds.get(factory)) : 'server'}:${JSON.stringify([dbName, storeName, storageKey])}`,
		async get(context): Promise<Keyed> {
			if (!manager) {
				unavailable()
				return new Map()
			}
			// Direct reads own their migration write. Keep the snapshot and rewrite in the same
			// transaction so a concurrent set cannot commit between them.
			return manager.run(storeName, async (db) => {
				const tx = db.transaction(storeName, !context && options.migrate ? 'readwrite' : 'readonly')
				const done = complete(tx)
				void done.catch(() => undefined)
				const store = tx.objectStore(storeName)
				const stored = await request<unknown>(store.get(storageKey))
				const { keyed, rewrite } = runMigration(stored, options)
				if (rewrite && !context) write(store, keyed)
				await done
				if (rewrite) context?.stageContainerRewrite?.(keyed)
				return keyed
			})
		},
		set(desired, context) {
			return mutate((current) => patchKeyed(current, desired, context))
		},
		rewriteContainer(values) {
			return mutate(() => values)
		},
		removeScope(path) {
			return mutate((current) => removeKeyedScope(current, path))
		},
	}
}

export function indexedDbAdapter(options: IndexedDbAdapterOptions = {}): AmbientAdapter {
	return { source: INDEXED_DB_SOURCE, port: createIndexedDbPort(options) }
}

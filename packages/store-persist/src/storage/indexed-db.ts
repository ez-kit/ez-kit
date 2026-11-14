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

const factoryIds = new WeakMap<IDBFactory, number>()
let nextFactoryId = 0

export function createIndexedDbPort(options: IndexedDbAdapterOptions = {}): SourcePort {
	const dbName = options.dbName ?? 'ez-kit'
	const storeName = options.storeName ?? 'persist'
	const storageKey = options.storageKey ?? DEFAULT_IDB_KEY
	const version = options.version ?? STORAGE_VERSION
	const factory = options.factory ?? (typeof indexedDB === 'undefined' ? null : indexedDB)
	if (factory && !factoryIds.has(factory)) factoryIds.set(factory, ++nextFactoryId)
	let pending: Promise<IDBDatabase> | null = null
	function database(): Promise<IDBDatabase> {
		if (!factory) return Promise.reject(new Error('IndexedDB is unavailable'))
		pending ??= new Promise<IDBDatabase>((resolve, reject) => {
			const open = factory.open(dbName, 1)
			open.onupgradeneeded = () => {
				if (!open.result.objectStoreNames.contains(storeName)) open.result.createObjectStore(storeName)
			}
			open.onsuccess = () => {
				resolve(open.result)
			}
			open.onerror = () => {
				reject(open.error ?? new Error('IndexedDB open failed'))
			}
		}).catch((error: unknown) => {
			pending = null
			throw error
		})
		return pending
	}
	async function mutate(transform: (current: Keyed) => Keyed): Promise<void> {
		if (!factory) return
		const db = await database()
		const tx = db.transaction(storeName, 'readwrite')
		const done = complete(tx)
		void done.catch(() => undefined)
		try {
			const store = tx.objectStore(storeName)
			const stored = await request<unknown>(store.get(storageKey))
			const next = transform(runMigration(stored, options).keyed)
			if (next.size) store.put(packBlob(next, version), storageKey)
			else store.delete(storageKey)
			await done
		} catch (error) {
			try {
				tx.abort()
			} catch {
				/* The failed transaction may already be closed. */
			}
			throw error
		}
	}
	return {
		capabilities: { recordVersions: true },
		identity: `indexedDB:${factory ? String(factoryIds.get(factory)) : 'server'}:${JSON.stringify([dbName, storeName, storageKey])}`,
		async get(context): Promise<Keyed> {
			if (!factory) return new Map()
			const db = await database()
			const tx = db.transaction(storeName, 'readonly')
			const stored = await request<unknown>(tx.objectStore(storeName).get(storageKey))
			const { keyed, rewrite } = runMigration(stored, options)
			if (rewrite) {
				if (context) context.stageContainerRewrite?.(keyed)
				else await mutate(() => keyed)
			}
			return keyed
		},
		set(desired, context) {
			return mutate((current) =>
				(context.meta as { containerRewrite?: unknown } | null)?.containerRewrite === true
					? desired
					: patchKeyed(current, desired, context),
			)
		},
		removeScope(path) {
			return mutate((current) => removeKeyedScope(current, path))
		},
	}
}

export function indexedDbAdapter(options: IndexedDbAdapterOptions = {}): AmbientAdapter {
	return { source: INDEXED_DB_SOURCE, port: createIndexedDbPort(options) }
}

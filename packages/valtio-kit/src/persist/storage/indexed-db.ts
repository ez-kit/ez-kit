import { type MigrationConfig, packBlob, runMigration, STORAGE_VERSION } from './blob'
import { createWriteQueue } from './write-queue'

import type { AmbientAdapter } from '../provider'
import type { Keyed, SourcePort } from '../types'

/** Source id for the IndexedDB engine, shared by the adapter and the `persistIndexedDb` wrapper. */
export const INDEXED_DB_SOURCE = 'indexedDB'

const DEFAULT_DB_NAME = 'valtio-kit'
const DEFAULT_STORE_NAME = 'persist'
/** Default record key under which a store's blob is written when none is configured. */
export const DEFAULT_IDB_KEY = 'state'

/** Options for the IndexedDB adapter (key + schema versioning + injectable factory). */
export type IndexedDbAdapterOptions = MigrationConfig & {
	/** Database name. Defaults to `valtio-kit`. */
	dbName?: string
	/** Object store name. Defaults to `persist`. */
	storeName?: string
	/** Record key under which this store's blob is written. Defaults to {@link DEFAULT_IDB_KEY}. */
	storageKey?: string
	/** IndexedDB factory. Defaults to the global `indexedDB`; injectable for tests. */
	factory?: IDBFactory
}

function resolveFactory(injected?: IDBFactory): IDBFactory | null {
	if (injected) {
		return injected
	}
	return typeof indexedDB === 'undefined' ? null : indexedDB
}

/** Promisify an `IDBRequest`. */
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

/** Resolve once an `IDBTransaction` commits (or reject if it errors/aborts). */
function txComplete(tx: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => {
			resolve()
		}
		tx.onerror = () => {
			reject(tx.error ?? new Error('IndexedDB transaction failed'))
		}
		tx.onabort = () => {
			reject(tx.error ?? new Error('IndexedDB transaction aborted'))
		}
	})
}

function openDb(factory: IDBFactory, dbName: string, storeName: string): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const open = factory.open(dbName, 1)
		open.onupgradeneeded = () => {
			const db = open.result
			if (!db.objectStoreNames.contains(storeName)) {
				db.createObjectStore(storeName)
			}
		}
		open.onsuccess = () => {
			resolve(open.result)
		}
		open.onerror = () => {
			reject(open.error ?? new Error('IndexedDB open failed'))
		}
	})
}

/**
 * Build an async {@link SourcePort} over IndexedDB. `get()`/`set()` return `Promise`. Writes go through a
 * serialized {@link createWriteQueue | write queue} (last-write-wins; superseded queued writes are
 * dropped). Because async sources resolve after synchronous ones, a late IDB hydration fills only the
 * fields still at their default (the engine's first-present-wins rule). Inert on the server (no factory).
 */
export function createIndexedDbPort(options: IndexedDbAdapterOptions = {}): SourcePort {
	const dbName = options.dbName ?? DEFAULT_DB_NAME
	const storeName = options.storeName ?? DEFAULT_STORE_NAME
	const storageKey = options.storageKey ?? DEFAULT_IDB_KEY
	const currentVersion = options.version ?? STORAGE_VERSION
	const migration: MigrationConfig = { version: currentVersion }
	if (options.migrate !== undefined) {
		migration.migrate = options.migrate
	}

	let dbPromise: Promise<IDBDatabase> | null = null
	function database(factory: IDBFactory): Promise<IDBDatabase> {
		return (dbPromise ??= openDb(factory, dbName, storeName))
	}

	async function write(desired: Keyed): Promise<void> {
		const factory = resolveFactory(options.factory)
		if (!factory) {
			return
		}
		const db = await database(factory)
		const tx = db.transaction(storeName, 'readwrite')
		const store = tx.objectStore(storeName)
		if (desired.size === 0) {
			store.delete(storageKey)
		} else {
			store.put(packBlob(desired, currentVersion), storageKey)
		}
		await txComplete(tx)
	}

	const queue = createWriteQueue<Keyed>(write)

	return {
		async get(): Promise<Keyed> {
			const factory = resolveFactory(options.factory)
			if (!factory) {
				return new Map()
			}
			try {
				const db = await database(factory)
				const tx = db.transaction(storeName, 'readonly')
				const stored = await request<unknown>(tx.objectStore(storeName).get(storageKey))
				const { keyed, rewrite } = runMigration(stored, migration)
				if (rewrite) {
					await queue.enqueue(keyed)
				}
				return keyed
			} catch {
				return new Map()
			}
		},

		set(desired: Keyed): Promise<void> {
			return queue.enqueue(desired)
		},
	}
}

/** Ambient adapter persisting a store to IndexedDB (async; client-only; inert on the server). */
export function indexedDbAdapter(options: IndexedDbAdapterOptions = {}): AmbientAdapter {
	return { source: INDEXED_DB_SOURCE, port: createIndexedDbPort(options) }
}

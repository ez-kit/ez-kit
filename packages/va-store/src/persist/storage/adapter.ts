import { type MigrationConfig, packBlob, runMigration, STORAGE_VERSION } from './blob'

import type { AmbientAdapter } from '../provider'
import type { Keyed, SyncSourcePort } from '../types'

/** Source id for the localStorage engine, shared by the adapter and the `persistLocalStorage` wrapper. */
export const LOCAL_STORAGE_SOURCE = 'localStorage'
/** Source id for the sessionStorage engine. */
export const SESSION_STORAGE_SOURCE = 'sessionStorage'

/** Default storage key under which a store's blob is written when none is configured. */
export const DEFAULT_STORAGE_KEY = 'va-store'

/** Per-field storage metadata, packed into `FieldDescriptor.meta` by the storage wrappers. */
export type StorageMeta = {
	/** Preferred blob key for this field's store (informational; the adapter owns the authoritative key). */
	storageKey?: string
}

/** Read the storage area, treating any access error (private mode, sandboxed iframe, SSR) as absent. */
function safeArea(area: () => Storage | null): Storage | null {
	try {
		return area()
	} catch {
		return null
	}
}

/**
 * Build a {@link SourcePort} over a Web Storage area, packing the binding's {@link Keyed} into a single
 * JSON blob (`{ v, s }`) under one key. Every read/write is guarded: unavailable storage and quota
 * errors warn at most once and never throw, and a corrupt blob falls back to defaults (clearing the key).
 * On the server (no area) `get()` returns an empty map and `set()` is a no-op.
 */
export function createStoragePort(
	area: () => Storage | null,
	storageKey: string,
	migration: MigrationConfig = {},
): SyncSourcePort {
	const currentVersion = migration.version ?? STORAGE_VERSION
	let warned = false
	const warnOnce = (error: unknown): void => {
		if (!warned) {
			warned = true
			// Documented behavior: storage failures degrade silently after one diagnostic.
			console.warn('[va-store] persist: storage unavailable, continuing without persistence', error)
		}
	}

	/** Persist the keyed values under the current version, removing the key when empty. Best-effort. */
	const writeKeyed = (storage: Storage, keyed: Keyed): void => {
		try {
			if (keyed.size === 0) {
				storage.removeItem(storageKey)
			} else {
				storage.setItem(storageKey, JSON.stringify(packBlob(keyed, currentVersion)))
			}
		} catch (error) {
			warnOnce(error)
		}
	}

	return {
		get(): Keyed {
			const storage = safeArea(area)
			if (!storage) {
				return new Map()
			}
			let raw: string | null
			try {
				raw = storage.getItem(storageKey)
			} catch (error) {
				warnOnce(error)
				return new Map()
			}
			if (raw === null) {
				return new Map()
			}
			try {
				const { keyed, rewrite } = runMigration(JSON.parse(raw), migration)
				if (rewrite) {
					writeKeyed(storage, keyed)
				}
				return keyed
			} catch {
				// Corrupt blob → defaults; clear the bad key so it can't poison future reads.
				try {
					storage.removeItem(storageKey)
				} catch {
					// Ignore: removal is best-effort cleanup.
				}
				return new Map()
			}
		},

		set(desired: Keyed): void {
			const storage = safeArea(area)
			if (!storage) {
				return
			}
			writeKeyed(storage, desired)
		},

		subscribe(onChange: () => void): () => void {
			if (typeof window === 'undefined') {
				return () => undefined
			}
			const handler = (event: StorageEvent): void => {
				// `storage` fires only in OTHER tabs, never the writer — so this can't echo back to itself.
				// A `null` key means `clear()`; otherwise react only to our own key and storage area.
				if (event.storageArea !== safeArea(area)) {
					return
				}
				if (event.key !== null && event.key !== storageKey) {
					return
				}
				onChange()
			}
			window.addEventListener('storage', handler)
			return () => {
				window.removeEventListener('storage', handler)
			}
		},
	}
}

const localStorageArea = (): Storage | null => (typeof window === 'undefined' ? null : window.localStorage)
const sessionStorageArea = (): Storage | null => (typeof window === 'undefined' ? null : window.sessionStorage)

/** Options shared by the storage adapter factories (key + schema versioning). */
export type StorageAdapterOptions = MigrationConfig & {
	/** Blob key under which this store's values are written. Defaults to {@link DEFAULT_STORAGE_KEY}. */
	storageKey?: string
}

function migrationOf(options: StorageAdapterOptions): MigrationConfig {
	const config: MigrationConfig = {}
	if (options.version !== undefined) {
		config.version = options.version
	}
	if (options.migrate !== undefined) {
		config.migrate = options.migrate
	}
	return config
}

/** Ambient adapter persisting a store to `localStorage` (client-only; inert on the server). */
export function localStorageAdapter(options: StorageAdapterOptions = {}): AmbientAdapter {
	return {
		source: LOCAL_STORAGE_SOURCE,
		port: createStoragePort(localStorageArea, options.storageKey ?? DEFAULT_STORAGE_KEY, migrationOf(options)),
	}
}

/** Ambient adapter persisting a store to `sessionStorage` (client-only; inert on the server). */
export function sessionStorageAdapter(options: StorageAdapterOptions = {}): AmbientAdapter {
	return {
		source: SESSION_STORAGE_SOURCE,
		port: createStoragePort(sessionStorageArea, options.storageKey ?? DEFAULT_STORAGE_KEY, migrationOf(options)),
	}
}

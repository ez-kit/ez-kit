import { persistField, type PersistFieldOptions } from '../decorators'

import { LOCAL_STORAGE_SOURCE, SESSION_STORAGE_SOURCE, type StorageMeta } from './adapter'
import { INDEXED_DB_SOURCE } from './indexed-db'

import type { AccessorFieldOptions } from '../accessor'
import type { Parser, PersistSchema } from '../types'

/** Options for the storage field wrappers (`persistLocalStorage` / `persistSessionStorage`). */
export type PersistStorageOptions<V> = {
	/** Override the leaf segment of the blob key (relative) — defaults to the property name. */
	key?: string
	/** Pin to an exact top-level blob key, ignoring ancestor segments. */
	absolute?: boolean
	/** Explicit parser. Omit to auto-resolve from the field's runtime value. */
	parser?: Parser<V>
	schema?: PersistSchema<V>
	/** Preferred blob key for this store (packed into `meta` for the adapter to read). */
	storageKey?: string
}

function storageMeta(options: { storageKey?: string }): StorageMeta {
	const meta: StorageMeta = {}
	if (options.storageKey !== undefined) {
		meta.storageKey = options.storageKey
	}
	return meta
}

function storageFieldOptions<V>(
	source: string,
	options: PersistStorageOptions<V>,
): PersistFieldOptions<V, StorageMeta> {
	const fieldOptions: PersistFieldOptions<V, StorageMeta> = { source, meta: storageMeta(options) }
	if (options.key !== undefined) {
		fieldOptions.key = options.key
	}
	if (options.absolute !== undefined) {
		fieldOptions.absolute = options.absolute
	}
	if (options.parser !== undefined) {
		fieldOptions.parser = options.parser
	}
	if (options.schema !== undefined) fieldOptions.schema = options.schema
	return fieldOptions
}

/**
 * localStorage field decorator — a thin wrapper over {@link persistField} targeting the localStorage
 * source. `key`/`absolute` are source-agnostic key naming (on the descriptor); `storageKey` is packed
 * into `meta` for the adapter.
 */
export function persistLocalStorage<V>(options: PersistStorageOptions<V> = {}) {
	return persistField<V, StorageMeta>(storageFieldOptions(LOCAL_STORAGE_SOURCE, options))
}

/** sessionStorage field decorator — like {@link persistLocalStorage}, backed by `sessionStorage`. */
export function persistSessionStorage<V>(options: PersistStorageOptions<V> = {}) {
	return persistField<V, StorageMeta>(storageFieldOptions(SESSION_STORAGE_SOURCE, options))
}

/** IndexedDB field decorator — like {@link persistLocalStorage}, backed by the async IndexedDB adapter. */
export function persistIndexedDb<V>(options: PersistStorageOptions<V> = {}) {
	return persistField<V, StorageMeta>(storageFieldOptions(INDEXED_DB_SOURCE, options))
}

function storageAccessor<V>(source: string, options: PersistStorageOptions<V>): AccessorFieldOptions<V, StorageMeta> {
	const accessor: AccessorFieldOptions<V, StorageMeta> = { source, meta: storageMeta(options) }
	if (options.key !== undefined) {
		accessor.key = options.key
	}
	if (options.absolute !== undefined) {
		accessor.absolute = options.absolute
	}
	if (options.parser !== undefined) {
		accessor.parser = options.parser
	}
	if (options.schema !== undefined) accessor.schema = options.schema
	return accessor
}

/** Build accessor options for a localStorage field — parity with {@link persistLocalStorage}. */
export function localStorageField<V = never>(
	options: PersistStorageOptions<V> = {},
): AccessorFieldOptions<V, StorageMeta> {
	return storageAccessor(LOCAL_STORAGE_SOURCE, options)
}

/** Build accessor options for a sessionStorage field — parity with {@link persistSessionStorage}. */
export function sessionStorageField<V = never>(
	options: PersistStorageOptions<V> = {},
): AccessorFieldOptions<V, StorageMeta> {
	return storageAccessor(SESSION_STORAGE_SOURCE, options)
}

/** Build accessor options for an IndexedDB field — parity with {@link persistIndexedDb}. */
export function indexedDbField<V = never>(
	options: PersistStorageOptions<V> = {},
): AccessorFieldOptions<V, StorageMeta> {
	return storageAccessor(INDEXED_DB_SOURCE, options)
}

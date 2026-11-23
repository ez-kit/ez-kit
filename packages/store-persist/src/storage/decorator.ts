import { persistField, type PersistFieldDecorator } from '../decorators'

import { LOCAL_STORAGE_SOURCE, SESSION_STORAGE_SOURCE, type StorageMeta } from './adapter'
import { INDEXED_DB_SOURCE } from './indexed-db'

import type {
	AccessorFieldOptions,
	FieldValueOptions,
	ValidatedAccessorFieldOptions,
	ValidatedValueOptions,
} from '../accessor'

/** Storage field options. Prefer Provider storageKey configuration for built-in adapters. */
type StorageOptions = {
	/** Source alias; defaults to the wrapper's existing built-in source. */
	source?: string
	key?: string
	/** Retained for a migration diagnostic; storage addresses use StoreId scopes instead. */
	absolute?: boolean
	/** Metadata available to custom adapters. Built-in ports select storageKey at registration. */
	storageKey?: string
}
export type PersistStorageOptions<V> = StorageOptions & FieldValueOptions<V>

function storageAccessor<V>(source: string, options: PersistStorageOptions<V>): AccessorFieldOptions<V, StorageMeta> {
	const { storageKey, ...values } = options
	return { ...values, source: options.source ?? source, meta: storageKey === undefined ? {} : { storageKey } }
}

/** localStorage decorator; `source` may select a mapped registration alias. */
export function persistLocalStorage<V>(options: StorageOptions & ValidatedValueOptions<V>): PersistFieldDecorator<V>
export function persistLocalStorage<V>(options?: PersistStorageOptions<V>): PersistFieldDecorator<V>
export function persistLocalStorage<V>(options: PersistStorageOptions<V> = {}): PersistFieldDecorator<V> {
	return persistField<V, StorageMeta>(storageAccessor<V>(LOCAL_STORAGE_SOURCE, options))
}

/** sessionStorage decorator; `source` may select a mapped registration alias. */
export function persistSessionStorage<V>(options: StorageOptions & ValidatedValueOptions<V>): PersistFieldDecorator<V>
export function persistSessionStorage<V>(options?: PersistStorageOptions<V>): PersistFieldDecorator<V>
export function persistSessionStorage<V>(options: PersistStorageOptions<V> = {}): PersistFieldDecorator<V> {
	return persistField<V, StorageMeta>(storageAccessor<V>(SESSION_STORAGE_SOURCE, options))
}

/** IndexedDB decorator; `source` may select a mapped registration alias. */
export function persistIndexedDb<V>(options: StorageOptions & ValidatedValueOptions<V>): PersistFieldDecorator<V>
export function persistIndexedDb<V>(options?: PersistStorageOptions<V>): PersistFieldDecorator<V>
export function persistIndexedDb<V>(options: PersistStorageOptions<V> = {}): PersistFieldDecorator<V> {
	return persistField<V, StorageMeta>(storageAccessor<V>(INDEXED_DB_SOURCE, options))
}

export function localStorageField<V>(
	options: StorageOptions & ValidatedValueOptions<V>,
): ValidatedAccessorFieldOptions<V, StorageMeta>
export function localStorageField<V = never>(options?: PersistStorageOptions<V>): AccessorFieldOptions<V, StorageMeta>
export function localStorageField<V>(options: PersistStorageOptions<V> = {}): AccessorFieldOptions<V, StorageMeta> {
	return storageAccessor<V>(LOCAL_STORAGE_SOURCE, options)
}

export function sessionStorageField<V>(
	options: StorageOptions & ValidatedValueOptions<V>,
): ValidatedAccessorFieldOptions<V, StorageMeta>
export function sessionStorageField<V = never>(options?: PersistStorageOptions<V>): AccessorFieldOptions<V, StorageMeta>
export function sessionStorageField<V>(options: PersistStorageOptions<V> = {}): AccessorFieldOptions<V, StorageMeta> {
	return storageAccessor<V>(SESSION_STORAGE_SOURCE, options)
}

export function indexedDbField<V>(
	options: StorageOptions & ValidatedValueOptions<V>,
): ValidatedAccessorFieldOptions<V, StorageMeta>
export function indexedDbField<V = never>(options?: PersistStorageOptions<V>): AccessorFieldOptions<V, StorageMeta>
export function indexedDbField<V>(options: PersistStorageOptions<V> = {}): AccessorFieldOptions<V, StorageMeta> {
	return storageAccessor<V>(INDEXED_DB_SOURCE, options)
}

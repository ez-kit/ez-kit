/**
 * Storage sources for the persist core: ambient `localStorage` / `sessionStorage` adapters plus their
 * `persist*`/accessor field fronts. Ambient — no React context required; client-only and inert on the
 * server. Pass an adapter to `PersistProvider adapters={[...]}` to drive it.
 */
export {
	createStoragePort,
	DEFAULT_STORAGE_KEY,
	LOCAL_STORAGE_SOURCE,
	localStorageAdapter,
	SESSION_STORAGE_SOURCE,
	sessionStorageAdapter,
	type StorageAdapterOptions,
	type StorageMeta,
} from './adapter'
export {
	localStorageField,
	persistLocalStorage,
	persistSessionStorage,
	type PersistStorageOptions,
	sessionStorageField,
} from './decorator'

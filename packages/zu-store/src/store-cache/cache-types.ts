import type { CacheRecord } from './types'
import type { StoreApi } from 'zustand/vanilla'

export type AnyStore = StoreApi<unknown>

/** Structural identity of a cached store: where (`path`), which group (`name`), which instance (`id`). */
export type StoreId = {
	path: readonly string[]
	name: string
	id: string
}

/** A mounted (live) store paired with its structural id, kept on the reactive view. */
export type MountedStore = { store: AnyStore; storeId: StoreId }

/** Reactive view of cached stores, keyed by canonical store id. Only observed stores appear here. */
export type CachedStoresState = {
	stores: ReadonlyMap<string, MountedStore>
}

export type CachedStoreMeta = {
	store: AnyStore
	storeId: StoreId
	observerCount: number
	gcTime: number
	/** Timestamp the store became idle (observerCount hit 0); `undefined` while observed. */
	idleSince: number | undefined
	evictionTimer: ReturnType<typeof setTimeout> | undefined
}

export type CacheInstance = {
	/** Reactive view of the mounted store instances, keyed by canonical store id. */
	cachedStores: StoreApi<CachedStoresState>
	/** Idempotent: register a store under `storeId` or return the existing one. Effect-phase only. */
	register: (storeId: StoreId, store: AnyStore, gcTime: number) => AnyStore
	/** Register a mounted Provider; keeps the store alive and cancels any pending eviction. */
	addObserver: (storeId: StoreId) => void
	/** Unregister a Provider; when the last one leaves, schedule eviction after `gcTime`. */
	removeObserver: (storeId: StoreId) => void
	/** Return the live store if present and not expired, without affecting its lifecycle. */
	getCachedStore: (storeId: StoreId) => AnyStore | undefined
	/** Remove the store immediately, regardless of observers or `alwaysCache`. */
	remove: (storeId: StoreId) => void
	/** Flat coordinates of mounted entries, optionally filtered to a path subtree. */
	keys: (prefix?: readonly string[]) => CacheRecord[]
	/** Remove every entry, or — with `prefix` — every entry under that path subtree, across groups. */
	clear: (prefix?: readonly string[]) => void
}

import type { CacheRecord } from './types'
import type { StoreApi } from 'zustand/vanilla'

export type AnyStore = StoreApi<unknown>

/** Structural identity of a cache entry: where (`path`), what (`group`), which (`cacheKey`). */
export type EntryId = {
	path: readonly string[]
	group: string
	cacheKey: string
}

/** A published (mounted) store paired with its structural id, kept on the reactive view. */
export type PublishedEntry = { store: AnyStore; id: EntryId }

/** Reactive view of published stores, keyed by canonical entry id. Only observed stores appear here. */
export type PublishedStoresState = {
	published: ReadonlyMap<string, PublishedEntry>
}

export type CachedStoreMeta = {
	store: AnyStore
	id: EntryId
	observerCount: number
	gcTime: number
	/** Timestamp the store became idle (observerCount hit 0); `undefined` while observed. */
	idleSince: number | undefined
	evictionTimer: ReturnType<typeof setTimeout> | undefined
}

export type CacheInstance = {
	/** Reactive view of the published (mounted) store instances, keyed by canonical entry id. */
	publishedStores: StoreApi<PublishedStoresState>
	/** Idempotent: register a store under `id` or return the existing one. Effect-phase only. */
	register: (id: EntryId, store: AnyStore, gcTime: number) => AnyStore
	/** Register a mounted Provider; keeps the store alive and cancels any pending eviction. */
	addObserver: (id: EntryId) => void
	/** Unregister a Provider; when the last one leaves, schedule eviction after `gcTime`. */
	removeObserver: (id: EntryId) => void
	/** Return the live store if present and not expired, without affecting its lifecycle. */
	getCachedStore: (id: EntryId) => AnyStore | undefined
	/** Remove the store immediately, regardless of observers or `alwaysCache`. */
	remove: (id: EntryId) => void
	/** Flat coordinates of published entries, optionally filtered to a path subtree. */
	keys: (prefix?: readonly string[]) => CacheRecord[]
	/** Remove every entry, or — with `prefix` — every entry under that path subtree, across groups. */
	clear: (prefix?: readonly string[]) => void
}

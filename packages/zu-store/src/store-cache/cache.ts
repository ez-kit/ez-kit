import { createStore } from 'zustand/vanilla'

import type { StoreApi } from 'zustand/vanilla'

export const DEFAULT_GC_TIME = 5 * 60 * 1000

type AnyStore = StoreApi<unknown>

/** group id → (cacheKey → live store). Only mounted (published) stores appear here. */
type GroupedStores = ReadonlyMap<string, ReadonlyMap<string, AnyStore>>

export type CachedStoresState = {
	storesByGroup: GroupedStores
}

type CachedStoreMeta = {
	store: AnyStore
	observerCount: number
	gcTime: number
	wasEverObserved: boolean
	/** Timestamp the store became idle (observerCount hit 0); `undefined` while observed. */
	idleSince: number | undefined
	evictionTimer: ReturnType<typeof setTimeout> | undefined
}

type MetaByGroup = Map<string, Map<string, CachedStoreMeta>>

export type CacheInstance = {
	/** Reactive view of the published (mounted) store instances, keyed by `(groupId, cacheKey)`. */
	cachedStores: StoreApi<CachedStoresState>
	/** Return the store for `(groupId, cacheKey)`, creating and seeding it on first access. */
	getOrCreate: (groupId: string, cacheKey: string, create: () => AnyStore, gcTime: number) => AnyStore
	/** Register a mounted Provider; keeps the store alive and cancels any pending eviction. */
	addObserver: (groupId: string, cacheKey: string) => void
	/** Unregister a Provider; when the last one leaves, schedule eviction after `gcTime`. */
	removeObserver: (groupId: string, cacheKey: string) => void
	/** Return the live store if present and not expired, without affecting its lifecycle. */
	getCachedStore: (groupId: string, cacheKey: string) => AnyStore | undefined
	/** Remove the store immediately, regardless of observers or `alwaysCache`. */
	remove: (groupId: string, cacheKey: string) => void
	/** Snapshot of published cacheKeys grouped by group id. */
	keys: () => Map<string, string[]>
	/** Remove every cached store across all groups. */
	clear: () => void
}

// ---------------------------------------------------------------------------
// Pure helpers — no closure state, fully determined by their arguments.
// ---------------------------------------------------------------------------

function getStoreMeta(metaByGroup: MetaByGroup, groupId: string, cacheKey: string): CachedStoreMeta | undefined {
	return metaByGroup.get(groupId)?.get(cacheKey)
}

function setStoreMeta(metaByGroup: MetaByGroup, groupId: string, cacheKey: string, meta: CachedStoreMeta): void {
	const groupMeta = metaByGroup.get(groupId) ?? new Map<string, CachedStoreMeta>()
	groupMeta.set(cacheKey, meta)
	metaByGroup.set(groupId, groupMeta)
}

function deleteStoreMeta(metaByGroup: MetaByGroup, groupId: string, cacheKey: string): void {
	const groupMeta = metaByGroup.get(groupId)
	groupMeta?.delete(cacheKey)
	if (groupMeta?.size === 0) metaByGroup.delete(groupId)
}

/** Grace window for a store that has never been observed (orphan from a discarded render). */
function effectiveGcTime(meta: CachedStoreMeta, defaultGcTime: number): number {
	if (meta.wasEverObserved) return meta.gcTime
	return meta.gcTime === Infinity ? defaultGcTime : meta.gcTime
}

function isExpired(meta: CachedStoreMeta, at: number, defaultGcTime: number): boolean {
	if (meta.observerCount > 0 || meta.idleSince === undefined) return false
	const gcTime = effectiveGcTime(meta, defaultGcTime)
	return gcTime !== Infinity && at - meta.idleSince >= gcTime
}

/** Immutable nested-map update. Returns the same map reference when nothing changes. */
function withPublishedStore(
	storesByGroup: GroupedStores,
	groupId: string,
	cacheKey: string,
	store: AnyStore | undefined,
): GroupedStores {
	const group = storesByGroup.get(groupId)
	if (store === undefined) {
		if (!group?.has(cacheKey)) return storesByGroup
	} else if (group?.get(cacheKey) === store) {
		return storesByGroup
	}

	const nextGroup = new Map(group ?? [])
	if (store === undefined) {
		nextGroup.delete(cacheKey)
	} else {
		nextGroup.set(cacheKey, store)
	}

	const next = new Map(storesByGroup)
	if (nextGroup.size === 0) {
		next.delete(groupId)
	} else {
		next.set(groupId, nextGroup)
	}
	return next
}

// ---------------------------------------------------------------------------
// Stateful instance — owns the meta map, the reactive store, and timers.
// ---------------------------------------------------------------------------

export function createCacheInstance(defaultGcTime: number): CacheInstance {
	// Source of truth (non-reactive): store instances + lifecycle bookkeeping, per group.
	const metaByGroup: MetaByGroup = new Map()
	// Reactive published view, mutated only outside render (addObserver / sweep / remove / clear).
	const cachedStores = createStore<CachedStoresState>(() => ({ storesByGroup: new Map() }))

	function publish(groupId: string, cacheKey: string, store: AnyStore | undefined): void {
		const current = cachedStores.getState().storesByGroup
		const next = withPublishedStore(current, groupId, cacheKey, store)
		if (next !== current) cachedStores.setState({ storesByGroup: next })
	}

	function remove(groupId: string, cacheKey: string): void {
		const meta = getStoreMeta(metaByGroup, groupId, cacheKey)
		if (meta?.evictionTimer) clearTimeout(meta.evictionTimer)
		deleteStoreMeta(metaByGroup, groupId, cacheKey)
		publish(groupId, cacheKey, undefined)
	}

	function sweepExpired(): void {
		const at = Date.now()
		for (const [groupId, groupMeta] of metaByGroup) {
			for (const [cacheKey, meta] of groupMeta) {
				if (isExpired(meta, at, defaultGcTime)) remove(groupId, cacheKey)
			}
		}
	}

	function scheduleEviction(groupId: string, cacheKey: string): void {
		const meta = getStoreMeta(metaByGroup, groupId, cacheKey)
		if (!meta) return
		if (meta.evictionTimer) {
			clearTimeout(meta.evictionTimer)
			meta.evictionTimer = undefined
		}
		const gcTime = effectiveGcTime(meta, defaultGcTime)
		if (gcTime === Infinity) return
		meta.evictionTimer = setTimeout(sweepExpired, gcTime)
	}

	function getOrCreate(groupId: string, cacheKey: string, create: () => AnyStore, gcTime: number): AnyStore {
		const existing = getStoreMeta(metaByGroup, groupId, cacheKey)
		if (existing) return existing.store

		const store = create()
		// Only `metaByGroup` (non-reactive) is touched here, so creation is safe during render.
		setStoreMeta(metaByGroup, groupId, cacheKey, {
			store,
			observerCount: 0,
			gcTime,
			wasEverObserved: false,
			idleSince: Date.now(),
			evictionTimer: undefined,
		})
		// Idle from birth: a discarded render that never observes is reclaimed by this orphan eviction.
		scheduleEviction(groupId, cacheKey)
		return store
	}

	function addObserver(groupId: string, cacheKey: string): void {
		const meta = getStoreMeta(metaByGroup, groupId, cacheKey)
		if (!meta) return
		meta.observerCount += 1
		meta.wasEverObserved = true
		meta.idleSince = undefined
		if (meta.evictionTimer) {
			clearTimeout(meta.evictionTimer)
			meta.evictionTimer = undefined
		}
		// Publish to the reactive view on commit (effect), never during render.
		publish(groupId, cacheKey, meta.store)
	}

	function removeObserver(groupId: string, cacheKey: string): void {
		const meta = getStoreMeta(metaByGroup, groupId, cacheKey)
		if (!meta) return
		meta.observerCount = Math.max(0, meta.observerCount - 1)
		if (meta.observerCount === 0) {
			meta.idleSince = Date.now()
			scheduleEviction(groupId, cacheKey)
		}
	}

	function getCachedStore(groupId: string, cacheKey: string): AnyStore | undefined {
		const meta = getStoreMeta(metaByGroup, groupId, cacheKey)
		if (!meta || isExpired(meta, Date.now(), defaultGcTime)) return undefined
		return cachedStores.getState().storesByGroup.get(groupId)?.get(cacheKey)
	}

	function keys(): Map<string, string[]> {
		const out = new Map<string, string[]>()
		for (const [groupId, group] of cachedStores.getState().storesByGroup) {
			out.set(groupId, [...group.keys()])
		}
		return out
	}

	function clear(): void {
		for (const groupMeta of metaByGroup.values()) {
			for (const meta of groupMeta.values()) {
				if (meta.evictionTimer) clearTimeout(meta.evictionTimer)
			}
		}
		metaByGroup.clear()
		cachedStores.setState({ storesByGroup: new Map() })
	}

	return { cachedStores, getOrCreate, addObserver, removeObserver, getCachedStore, remove, keys, clear }
}

import { createStore } from 'zustand/vanilla'

import type { CacheCoordinate, CacheTree } from './types'
import type { StoreApi } from 'zustand/vanilla'

export const DEFAULT_GC_TIME = 5 * 60 * 1000

type AnyStore = StoreApi<unknown>

/** Structural identity of a cache entry: where (`path`), what (`group`), which (`key`). */
export type EntryId = {
	path: readonly string[]
	group: string
	key: string
}

/** A published (mounted) store together with its structural coordinate. */
type PublishedEntry = { store: AnyStore; coord: CacheCoordinate }

/** Reactive view of published stores, keyed by canonical entry id. Only mounted stores appear here. */
export type CachedStoresState = {
	stores: ReadonlyMap<string, PublishedEntry>
}

type CachedStoreMeta = {
	store: AnyStore
	coord: CacheCoordinate
	observerCount: number
	gcTime: number
	wasEverObserved: boolean
	/** Timestamp the store became idle (observerCount hit 0); `undefined` while observed. */
	idleSince: number | undefined
	evictionTimer: ReturnType<typeof setTimeout> | undefined
}

type MetaByKey = Map<string, CachedStoreMeta>

export type CacheInstance = {
	/** Reactive view of the published (mounted) store instances, keyed by canonical entry id. */
	cachedStores: StoreApi<CachedStoresState>
	/** Return the store for `id`, creating and seeding it on first access. */
	getOrCreate: (id: EntryId, create: () => AnyStore, gcTime: number) => AnyStore
	/** Register a mounted Provider; keeps the store alive and cancels any pending eviction. */
	addObserver: (id: EntryId) => void
	/** Unregister a Provider; when the last one leaves, schedule eviction after `gcTime`. */
	removeObserver: (id: EntryId) => void
	/** Return the live store if present and not expired, without affecting its lifecycle. */
	getCachedStore: (id: EntryId) => AnyStore | undefined
	/** Remove the store immediately, regardless of observers or `alwaysCache`. */
	remove: (id: EntryId) => void
	/** Flat coordinates of published entries, optionally filtered to a path subtree. */
	keys: (prefix?: readonly string[]) => CacheCoordinate[]
	/** Remove every entry, or — with `prefix` — every entry under that path subtree, across groups. */
	clear: (prefix?: readonly string[]) => void
}

// ---------------------------------------------------------------------------
// Pure helpers — no closure state, fully determined by their arguments.
// ---------------------------------------------------------------------------

/** Canonical map identity for an entry. JSON-encoded so no delimiter can collide across segments. */
export function serializeEntryId(id: EntryId): string {
	return JSON.stringify([id.path, id.group, id.key])
}

function toCoord(id: EntryId): CacheCoordinate {
	return { path: [...id.path], group: id.group, key: id.key }
}

/** Segment-wise prefix test on the structural path — never a string `startsWith`. */
function hasPathPrefix(path: readonly string[], prefix: readonly string[]): boolean {
	if (prefix.length > path.length) return false
	for (let i = 0; i < prefix.length; i += 1) {
		if (path[i] !== prefix[i]) return false
	}
	return true
}

/** Build the nested object view from flat coordinates. Pure: returns a fresh tree each call. */
export function toTree(coords: readonly CacheCoordinate[]): CacheTree {
	const root: CacheTree = {}
	for (const { path, group, key } of coords) {
		let node = root
		for (const segment of path) {
			const existing = node[segment]
			if (existing !== undefined && !Array.isArray(existing)) {
				node = existing
			} else {
				const created: CacheTree = {}
				node[segment] = created
				node = created
			}
		}
		const leaf = node[group]
		if (Array.isArray(leaf)) {
			leaf.push(key)
		} else {
			node[group] = [key]
		}
	}
	return root
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

/** Immutable flat-map update. Returns the same map reference when nothing changes. */
function withPublishedStore(
	stores: ReadonlyMap<string, PublishedEntry>,
	id: EntryId,
	store: AnyStore | undefined,
): ReadonlyMap<string, PublishedEntry> {
	const canonical = serializeEntryId(id)
	if (store === undefined) {
		if (!stores.has(canonical)) return stores
		const next = new Map(stores)
		next.delete(canonical)
		return next
	}
	if (stores.get(canonical)?.store === store) return stores
	const next = new Map(stores)
	next.set(canonical, { store, coord: toCoord(id) })
	return next
}

// ---------------------------------------------------------------------------
// Stateful instance — owns the meta map, the reactive store, and timers.
// ---------------------------------------------------------------------------

export function createCacheInstance(defaultGcTime: number): CacheInstance {
	// Source of truth (non-reactive): store instances + lifecycle bookkeeping, flat by canonical id.
	const metaByKey: MetaByKey = new Map()
	// Reactive published view, mutated only outside render (addObserver / sweep / remove / clear).
	const cachedStores = createStore<CachedStoresState>(() => ({ stores: new Map() }))

	function publish(id: EntryId, store: AnyStore | undefined): void {
		const current = cachedStores.getState().stores
		const next = withPublishedStore(current, id, store)
		if (next !== current) cachedStores.setState({ stores: next })
	}

	function remove(id: EntryId): void {
		const meta = metaByKey.get(serializeEntryId(id))
		if (meta?.evictionTimer) clearTimeout(meta.evictionTimer)
		metaByKey.delete(serializeEntryId(id))
		publish(id, undefined)
	}

	function sweepExpired(): void {
		const at = Date.now()
		for (const meta of [...metaByKey.values()]) {
			if (isExpired(meta, at, defaultGcTime)) remove(meta.coord)
		}
	}

	function scheduleEviction(id: EntryId): void {
		const meta = metaByKey.get(serializeEntryId(id))
		if (!meta) return
		if (meta.evictionTimer) {
			clearTimeout(meta.evictionTimer)
			meta.evictionTimer = undefined
		}
		const gcTime = effectiveGcTime(meta, defaultGcTime)
		if (gcTime === Infinity) return
		meta.evictionTimer = setTimeout(sweepExpired, gcTime)
	}

	function getOrCreate(id: EntryId, create: () => AnyStore, gcTime: number): AnyStore {
		const existing = metaByKey.get(serializeEntryId(id))
		if (existing) return existing.store

		const store = create()
		// Only `metaByKey` (non-reactive) is touched here, so creation is safe during render.
		metaByKey.set(serializeEntryId(id), {
			store,
			coord: toCoord(id),
			observerCount: 0,
			gcTime,
			wasEverObserved: false,
			idleSince: Date.now(),
			evictionTimer: undefined,
		})
		// Idle from birth: a discarded render that never observes is reclaimed by this orphan eviction.
		scheduleEviction(id)
		return store
	}

	function addObserver(id: EntryId): void {
		const meta = metaByKey.get(serializeEntryId(id))
		if (!meta) return
		meta.observerCount += 1
		meta.wasEverObserved = true
		meta.idleSince = undefined
		if (meta.evictionTimer) {
			clearTimeout(meta.evictionTimer)
			meta.evictionTimer = undefined
		}
		// Publish to the reactive view on commit (effect), never during render.
		publish(id, meta.store)
	}

	function removeObserver(id: EntryId): void {
		const meta = metaByKey.get(serializeEntryId(id))
		if (!meta) return
		meta.observerCount = Math.max(0, meta.observerCount - 1)
		if (meta.observerCount === 0) {
			meta.idleSince = Date.now()
			scheduleEviction(id)
		}
	}

	function getCachedStore(id: EntryId): AnyStore | undefined {
		const meta = metaByKey.get(serializeEntryId(id))
		if (!meta || isExpired(meta, Date.now(), defaultGcTime)) return undefined
		return cachedStores.getState().stores.get(serializeEntryId(id))?.store
	}

	function keys(prefix?: readonly string[]): CacheCoordinate[] {
		const out: CacheCoordinate[] = []
		for (const { coord } of cachedStores.getState().stores.values()) {
			if (!prefix || hasPathPrefix(coord.path, prefix)) {
				out.push({ path: [...coord.path], group: coord.group, key: coord.key })
			}
		}
		return out
	}

	function clear(prefix?: readonly string[]): void {
		if (!prefix) {
			for (const meta of metaByKey.values()) {
				if (meta.evictionTimer) clearTimeout(meta.evictionTimer)
			}
			metaByKey.clear()
			cachedStores.setState({ stores: new Map() })
			return
		}
		for (const meta of [...metaByKey.values()]) {
			if (hasPathPrefix(meta.coord.path, prefix)) remove(meta.coord)
		}
	}

	return { cachedStores, getOrCreate, addObserver, removeObserver, getCachedStore, remove, keys, clear }
}

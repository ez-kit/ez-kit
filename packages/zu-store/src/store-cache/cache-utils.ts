import type { AnyStore, CachedStoreMeta, MountedStore, StoreId } from './cache-types'
import type { CacheAddress, CacheRecord } from './types'

/** Shared empty-path sentinel for `path?` defaults. */
export const EMPTY_PATH: readonly string[] = []

/** Canonical map identity for a store. JSON-encoded so no delimiter can collide across segments. */
export function serializeStoreId(storeId: StoreId): string {
	return JSON.stringify([storeId.path, storeId.name, storeId.id])
}

/** Build a `StoreId` from a public-facing target plus its group name. */
export function toStoreId(target: CacheAddress, name: string): StoreId {
	return { path: target.path ?? EMPTY_PATH, name, id: target.id }
}

/** Convert an internal `StoreId` to its public `CacheRecord` shape. Materialises a fresh path array. */
export function toRecord(storeId: StoreId): CacheRecord {
	return { path: [...storeId.path], name: storeId.name, id: storeId.id }
}

/** Collect public coordinates of mounted stores, optionally filtered to a path subtree. Pure. */
export function toRecords(stores: Iterable<MountedStore>, prefix?: readonly string[]): CacheRecord[] {
	const out: CacheRecord[] = []
	for (const { storeId } of stores) {
		if (!prefix || hasPathPrefix(storeId.path, prefix)) out.push(toRecord(storeId))
	}
	return out
}

/** Segment-wise prefix test on the structural path — never a string `startsWith`. */
export function hasPathPrefix(path: readonly string[], prefix: readonly string[]): boolean {
	if (prefix.length > path.length) return false
	for (let i = 0; i < prefix.length; i += 1) {
		if (path[i] !== prefix[i]) return false
	}
	return true
}

/**
 * True when a mounted store has no observers and has been idle past `gcTime`. Never expires when pinned
 * (`gcTime === Infinity`). Observe-on-effect means there is no orphan window to grace.
 */
export function isExpired(meta: CachedStoreMeta, now: number): boolean {
	if (meta.observerCount > 0 || meta.idleSince === undefined) return false
	return meta.gcTime !== Infinity && now - meta.idleSince >= meta.gcTime
}

/** Immutable flat-map update of the cached-store view. Returns the same map when nothing changes. */
export function updateCachedStores(
	stores: ReadonlyMap<string, MountedStore>,
	storeId: StoreId,
	store: AnyStore | undefined,
): ReadonlyMap<string, MountedStore> {
	const key = serializeStoreId(storeId)
	if (store === undefined) {
		if (!stores.has(key)) return stores
		const next = new Map(stores)
		next.delete(key)
		return next
	}
	if (stores.get(key)?.store === store) return stores
	const next = new Map(stores)
	next.set(key, { store, storeId })
	return next
}

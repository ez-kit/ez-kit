import type { AnyStore, CachedStoreMeta, EntryId, PublishedEntry } from './cache-types'
import type { CacheAddress, CacheRecord } from './types'

/** Shared empty-path sentinel for `path?` defaults. */
export const EMPTY_PATH: readonly string[] = []

/** Canonical map identity for an entry. JSON-encoded so no delimiter can collide across segments. */
export function serializeEntryId(id: EntryId): string {
	return JSON.stringify([id.path, id.group, id.cacheKey])
}

/** Build an `EntryId` from a public-facing target plus its group context. */
export function toEntryId(target: CacheAddress, group: string): EntryId {
	return { path: target.path ?? EMPTY_PATH, group, cacheKey: target.cacheKey }
}

/** Convert an internal `EntryId` to its public `CacheRecord` shape. Materialises a fresh path array. */
export function toRecord(id: EntryId): CacheRecord {
	return { path: [...id.path], group: id.group, cacheKey: id.cacheKey }
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
 * True when a published entry has no observers and has been idle past `gcTime`. Never expires when pinned
 * (`gcTime === Infinity`). Observe-on-effect means there is no orphan window to grace.
 */
export function isExpired(meta: CachedStoreMeta, now: number): boolean {
	if (meta.observerCount > 0 || meta.idleSince === undefined) return false
	return meta.gcTime !== Infinity && now - meta.idleSince >= meta.gcTime
}

/** Immutable flat-map update of the published view. Returns the same map when nothing changes. */
export function withPublishedStore(
	published: ReadonlyMap<string, PublishedEntry>,
	id: EntryId,
	store: AnyStore | undefined,
): ReadonlyMap<string, PublishedEntry> {
	const canonical = serializeEntryId(id)
	if (store === undefined) {
		if (!published.has(canonical)) return published
		const next = new Map(published)
		next.delete(canonical)
		return next
	}
	if (published.get(canonical)?.store === store) return published
	const next = new Map(published)
	next.set(canonical, { store, id })
	return next
}

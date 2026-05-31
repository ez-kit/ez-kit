import { createStore } from 'zustand/vanilla'

import {
	hasPathPrefix,
	isExpired,
	serializeEntryId,
	toRecord,
	withPublishedStore,
} from './cache-utils'

import type {
	AnyStore,
	CacheInstance,
	CachedStoreMeta,
	EntryId,
	PublishedStoresState,
} from './cache-types'
import type { CacheRecord } from './types'

export const DEFAULT_GC_TIME = 5 * 60 * 1000

type MetaByKey = Map<string, CachedStoreMeta>

/**
 * Owns the meta map, the reactive published view, and timers.
 * Side effects (`register`, `addObserver`, `removeObserver`, `remove`, `clear`) are intended for
 * effect-phase or imperative call sites only — never during React render.
 */
export function createCacheInstance(_defaultGcTime: number): CacheInstance {
	const metaByKey: MetaByKey = new Map()
	const publishedStores = createStore<PublishedStoresState>(() => ({ published: new Map() }))

	function publish(id: EntryId, store: AnyStore | undefined): void {
		const current = publishedStores.getState().published
		const next = withPublishedStore(current, id, store)
		if (next !== current) publishedStores.setState({ published: next })
	}

	function remove(id: EntryId): void {
		const canonical = serializeEntryId(id)
		const meta = metaByKey.get(canonical)
		if (meta?.evictionTimer) clearTimeout(meta.evictionTimer)
		metaByKey.delete(canonical)
		publish(id, undefined)
	}

	function sweepExpired(): void {
		const now = Date.now()
		for (const meta of [...metaByKey.values()]) {
			if (isExpired(meta, now)) remove(meta.id)
		}
	}

	function scheduleEviction(id: EntryId): void {
		const meta = metaByKey.get(serializeEntryId(id))
		if (!meta) return
		if (meta.evictionTimer) {
			clearTimeout(meta.evictionTimer)
			meta.evictionTimer = undefined
		}
		if (meta.gcTime === Infinity) return
		meta.evictionTimer = setTimeout(sweepExpired, meta.gcTime)
	}

	function register(id: EntryId, store: AnyStore, gcTime: number): AnyStore {
		const canonical = serializeEntryId(id)
		const existing = metaByKey.get(canonical)
		if (existing) return existing.store
		metaByKey.set(canonical, {
			store,
			id,
			observerCount: 0,
			gcTime,
			idleSince: Date.now(),
			evictionTimer: undefined,
		})
		return store
	}

	function addObserver(id: EntryId): void {
		const meta = metaByKey.get(serializeEntryId(id))
		if (!meta) return
		meta.observerCount += 1
		meta.idleSince = undefined
		if (meta.evictionTimer) {
			clearTimeout(meta.evictionTimer)
			meta.evictionTimer = undefined
		}
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
		const canonical = serializeEntryId(id)
		const meta = metaByKey.get(canonical)
		if (!meta || isExpired(meta, Date.now())) return undefined
		return publishedStores.getState().published.get(canonical)?.store
	}

	function keys(prefix?: readonly string[]): CacheRecord[] {
		const out: CacheRecord[] = []
		for (const { id } of publishedStores.getState().published.values()) {
			if (!prefix || hasPathPrefix(id.path, prefix)) {
				out.push(toRecord(id))
			}
		}
		return out
	}

	function clearAll(): void {
		for (const meta of metaByKey.values()) {
			if (meta.evictionTimer) clearTimeout(meta.evictionTimer)
		}
		metaByKey.clear()
		publishedStores.setState({ published: new Map() })
	}

	function clearSubtree(prefix: readonly string[]): void {
		const matchedCanonicals: string[] = []
		for (const [canonical, meta] of metaByKey) {
			if (hasPathPrefix(meta.id.path, prefix)) matchedCanonicals.push(canonical)
		}
		if (matchedCanonicals.length === 0) return
		for (const canonical of matchedCanonicals) {
			const meta = metaByKey.get(canonical)
			if (meta?.evictionTimer) clearTimeout(meta.evictionTimer)
			metaByKey.delete(canonical)
		}
		const current = publishedStores.getState().published
		const next = new Map(current)
		let mutated = false
		for (const canonical of matchedCanonicals) {
			if (next.delete(canonical)) mutated = true
		}
		if (mutated) publishedStores.setState({ published: next })
	}

	function clear(prefix?: readonly string[]): void {
		if (!prefix) clearAll()
		else clearSubtree(prefix)
	}

	return { publishedStores, register, addObserver, removeObserver, getCachedStore, remove, keys, clear }
}

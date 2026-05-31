import { createStore } from 'zustand/vanilla'

import { hasPathPrefix, isExpired, serializeStoreId, toRecords, updateCachedStores } from './cache-utils'

import type { AnyStore, CacheInstance, CachedStoreMeta, CachedStoresState, StoreId } from './cache-types'
import type { CacheRecord } from './types'

export const DEFAULT_GC_TIME = 5 * 60 * 1000

type MetaByKey = Map<string, CachedStoreMeta>

/**
 * Owns the meta map, the reactive cached-store view, and timers.
 * Side effects (`register`, `addObserver`, `removeObserver`, `remove`, `clear`) are intended for
 * effect-phase or imperative call sites only — never during React render.
 */
export function createCacheInstance(_defaultGcTime: number): CacheInstance {
	const metaByKey: MetaByKey = new Map()
	const cachedStores = createStore<CachedStoresState>(() => ({ stores: new Map() }))

	function setCachedStore(storeId: StoreId, store: AnyStore | undefined): void {
		const current = cachedStores.getState().stores
		const next = updateCachedStores(current, storeId, store)
		if (next !== current) cachedStores.setState({ stores: next })
	}

	function remove(storeId: StoreId): void {
		const key = serializeStoreId(storeId)
		const meta = metaByKey.get(key)
		if (meta?.evictionTimer) clearTimeout(meta.evictionTimer)
		metaByKey.delete(key)
		setCachedStore(storeId, undefined)
	}

	function removeExpired(): void {
		const now = Date.now()
		for (const meta of [...metaByKey.values()]) {
			if (isExpired(meta, now)) remove(meta.storeId)
		}
	}

	function scheduleEviction(storeId: StoreId): void {
		const meta = metaByKey.get(serializeStoreId(storeId))
		if (!meta) return
		if (meta.evictionTimer) {
			clearTimeout(meta.evictionTimer)
			meta.evictionTimer = undefined
		}
		if (meta.gcTime === Infinity) return
		meta.evictionTimer = setTimeout(removeExpired, meta.gcTime)
	}

	function register(storeId: StoreId, store: AnyStore, gcTime: number): AnyStore {
		const key = serializeStoreId(storeId)
		const existing = metaByKey.get(key)
		if (existing) return existing.store
		metaByKey.set(key, {
			store,
			storeId,
			observerCount: 0,
			gcTime,
			idleSince: Date.now(),
			evictionTimer: undefined,
		})
		return store
	}

	function addObserver(storeId: StoreId): void {
		const meta = metaByKey.get(serializeStoreId(storeId))
		if (!meta) return
		meta.observerCount += 1
		meta.idleSince = undefined
		if (meta.evictionTimer) {
			clearTimeout(meta.evictionTimer)
			meta.evictionTimer = undefined
		}
		setCachedStore(storeId, meta.store)
	}

	function removeObserver(storeId: StoreId): void {
		const meta = metaByKey.get(serializeStoreId(storeId))
		if (!meta) return
		meta.observerCount = Math.max(0, meta.observerCount - 1)
		if (meta.observerCount === 0) {
			meta.idleSince = Date.now()
			scheduleEviction(storeId)
		}
	}

	function getCachedStore(storeId: StoreId): AnyStore | undefined {
		const key = serializeStoreId(storeId)
		const meta = metaByKey.get(key)
		if (!meta || isExpired(meta, Date.now())) return undefined
		return cachedStores.getState().stores.get(key)?.store
	}

	function keys(prefix?: readonly string[]): CacheRecord[] {
		return toRecords(cachedStores.getState().stores.values(), prefix)
	}

	function clearAll(): void {
		for (const meta of metaByKey.values()) {
			if (meta.evictionTimer) clearTimeout(meta.evictionTimer)
		}
		metaByKey.clear()
		cachedStores.setState({ stores: new Map() })
	}

	function clearSubtree(prefix: readonly string[]): void {
		const matchedKeys: string[] = []
		for (const [key, meta] of metaByKey) {
			if (hasPathPrefix(meta.storeId.path, prefix)) matchedKeys.push(key)
		}
		if (matchedKeys.length === 0) return
		for (const key of matchedKeys) {
			const meta = metaByKey.get(key)
			if (meta?.evictionTimer) clearTimeout(meta.evictionTimer)
			metaByKey.delete(key)
		}
		const current = cachedStores.getState().stores
		const next = new Map(current)
		let mutated = false
		for (const key of matchedKeys) {
			if (next.delete(key)) mutated = true
		}
		if (mutated) cachedStores.setState({ stores: next })
	}

	function clear(prefix?: readonly string[]): void {
		if (!prefix) clearAll()
		else clearSubtree(prefix)
	}

	return { cachedStores, register, addObserver, removeObserver, getCachedStore, remove, keys, clear }
}

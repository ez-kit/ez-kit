import { serializeStoreId } from '../store-id'

import { createMembershipView, startsWithPrefix, toRecords, updateMembership } from './cache-utils'

import type { InstanceMeta, MembershipView } from './cache-types'
import type { CacheRecord, CreateOptions } from './types'
import type { PluginCleanup } from '../plugin'
import type { StoreId } from '../store-id'

export const DEFAULT_GC_TIME = 5 * 60 * 1000

/**
 * Pure, manager-agnostic instance cache. Holds opaque instances keyed by a serialized `StoreId`, with
 * observer ref-counting and timer-based GC. MUST NOT import React or any store manager.
 */
export type InstanceCache = {
	/** Miss: create + run plugin setups; hit: return the existing instance with NO re-run. */
	getOrCreate: <T>(id: StoreId, create: () => T, opts: CreateOptions<T>) => T
	/** Register a mounted observer; keeps the entry alive and cancels any pending eviction. */
	addObserver: (id: StoreId) => void
	/** Unregister an observer; when the last one leaves, schedule eviction after the entry's `gcTime`. */
	removeObserver: (id: StoreId) => void
	/** Flat coordinates of live entries, optionally filtered to a path subtree. Non-reactive snapshot. */
	keys: (prefix?: readonly string[]) => CacheRecord[]
	/** Remove every entry, or — with `prefix` — every entry under that path subtree. Runs cleanups. */
	clear: (prefix?: readonly string[]) => void
	/** Remove a single entry by exact id, running its cleanups. No-op when absent. */
	remove: (id: StoreId) => void
	/** Subscribe to membership changes (entries added/removed). For the React layer. */
	subscribe: (listener: () => void) => () => void
	/**
	 * Stable membership snapshot for `useSyncExternalStore`. Returns the same array reference until
	 * membership changes, so React's snapshot caching invariant holds.
	 */
	getKeysSnapshot: () => readonly CacheRecord[]
	/** Live instance for `id` if present and not expired, without affecting its lifecycle. */
	getInstance: (id: StoreId) => object | undefined
}

type CacheConfig = { defaultGcTime?: number }

export function createInstanceCache(options: CacheConfig = {}): InstanceCache {
	// Reserved default: entries always supply an explicit `gcTime` via `CreateOptions` today, so the
	// cache-level default is accepted (parity with the React-layer config) but not yet consulted.
	const { defaultGcTime: _defaultGcTime = DEFAULT_GC_TIME } = options
	const metaByKey = new Map<string, InstanceMeta>()
	const membership: MembershipView = createMembershipView()
	// Cached keys snapshot for useSyncExternalStore: recomputed only when membership changes.
	let keysSnapshot: readonly CacheRecord[] = toRecords(membership.getSnapshot().values())

	function setMembership(storeId: StoreId, instance: object | undefined): void {
		const current = membership.getSnapshot()
		const next = updateMembership(current, storeId, instance)
		if (next !== current) {
			// Recompute the cached keys snapshot BEFORE notifying. `membership.set` invokes subscribers
			// synchronously, and `useSyncExternalStore` consumers read `getKeysSnapshot()` at notify time —
			// so the snapshot must already reflect `next`, or the change is missed.
			keysSnapshot = toRecords(next.values())
			membership.set(next)
		}
	}

	function runCleanups(meta: InstanceMeta): void {
		if (meta.cleared) return
		meta.cleared = true
		for (const cleanup of meta.cleanups) {
			if (cleanup) cleanup()
		}
	}

	function dropEntry(key: string, meta: InstanceMeta): void {
		if (meta.evictionTimer) clearTimeout(meta.evictionTimer)
		runCleanups(meta)
		metaByKey.delete(key)
		setMembership(meta.storeId, undefined)
	}

	/**
	 * Eviction timer callback for a single entry. The timer is the authority on the deadline: it is
	 * installed only when the last observer leaves and cleared the moment one returns, so reaching
	 * here means the entry is due. Deliberately does NOT re-derive expiry from `Date.now()` — the
	 * wall clock drifts against the runtime's timer clock, so a marginally early fire would fail
	 * that comparison and strand the entry alive with no timer left to retry it.
	 */
	function evictIfIdle(key: string): void {
		const meta = metaByKey.get(key)
		if (!meta) return
		meta.evictionTimer = undefined
		if (meta.observerCount > 0) return
		dropEntry(key, meta)
	}

	function scheduleEviction(storeId: StoreId): void {
		const key = serializeStoreId(storeId)
		const meta = metaByKey.get(key)
		if (!meta) return
		if (meta.evictionTimer) {
			clearTimeout(meta.evictionTimer)
			meta.evictionTimer = undefined
		}
		if (meta.gcTime === Infinity) return
		// Per-entry timer: a fired deadline must never sweep siblings whose own gcTime is not up yet.
		meta.evictionTimer = setTimeout(() => {
			evictIfIdle(key)
		}, meta.gcTime)
	}

	function getOrCreate<T>(id: StoreId, create: () => T, opts: CreateOptions<T>): T {
		const key = serializeStoreId(id)
		const existing = metaByKey.get(key)
		if (existing) return existing.instance as T

		const instance = create()
		const cleanups: PluginCleanup[] = opts.plugins.map((plugin) => plugin.setup(instance, opts.context))
		metaByKey.set(key, {
			instance: instance as object,
			storeId: id,
			observerCount: 0,
			gcTime: opts.gcTime,
			evictionTimer: undefined,
			cleanups,
			cleared: false,
		})
		return instance
	}

	function addObserver(id: StoreId): void {
		const meta = metaByKey.get(serializeStoreId(id))
		if (!meta) return
		meta.observerCount += 1
		if (meta.evictionTimer) {
			clearTimeout(meta.evictionTimer)
			meta.evictionTimer = undefined
		}
		setMembership(id, meta.instance)
	}

	function removeObserver(id: StoreId): void {
		const meta = metaByKey.get(serializeStoreId(id))
		if (!meta) return
		meta.observerCount = Math.max(0, meta.observerCount - 1)
		if (meta.observerCount === 0) {
			scheduleEviction(id)
		}
	}

	function getInstance(id: StoreId): object | undefined {
		// Membership alone decides liveness. Screening on a wall-clock deadline here would let this
		// answer flip without any membership change — and `useFromCache` recomputes its live instance
		// only when the membership signature changes, so the two would disagree.
		return membership.getSnapshot().get(serializeStoreId(id))?.instance
	}

	function keys(prefix?: readonly string[]): CacheRecord[] {
		return toRecords(membership.getSnapshot().values(), prefix)
	}

	function clear(prefix?: readonly string[]): void {
		for (const [key, meta] of [...metaByKey]) {
			if (!prefix || startsWithPrefix(meta.storeId.path, prefix)) dropEntry(key, meta)
		}
	}

	function remove(id: StoreId): void {
		const key = serializeStoreId(id)
		const meta = metaByKey.get(key)
		if (meta) dropEntry(key, meta)
	}

	return {
		getOrCreate,
		addObserver,
		removeObserver,
		getInstance,
		keys,
		clear,
		remove,
		subscribe: membership.subscribe,
		getKeysSnapshot: () => keysSnapshot,
	}
}

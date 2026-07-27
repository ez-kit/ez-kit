import { serializeStoreId } from '../store-id'

import type { AnyInstance, MembershipView, MountedInstance } from './cache-types'
import type { CacheAddress, CacheRecord } from './types'
import type { StoreId } from '../store-id'

/** Shared empty-path sentinel for `path?` defaults. */
export const EMPTY_PATH: readonly string[] = []

/** Build a `StoreId` from a public-facing target plus its group name. */
export function toStoreId(target: CacheAddress, name: string): StoreId {
	return { path: target.path ?? EMPTY_PATH, name, id: target.id }
}

/** Convert an internal `StoreId` to its public `CacheRecord` shape. Materialises a fresh path array. */
export function toRecord(storeId: StoreId): CacheRecord {
	return { path: [...storeId.path], name: storeId.name, id: storeId.id }
}

/** Collect public coordinates of mounted instances, optionally filtered to a path subtree. Pure. */
export function toRecords(instances: Iterable<MountedInstance>, prefix?: readonly string[]): CacheRecord[] {
	const out: CacheRecord[] = []
	for (const { storeId } of instances) {
		if (!prefix || startsWithPrefix(storeId.path, prefix)) out.push(toRecord(storeId))
	}
	return out
}

/** Segment-wise prefix test on the structural path — never a string `startsWith`. */
export function startsWithPrefix(path: readonly string[], prefix: readonly string[]): boolean {
	if (prefix.length > path.length) return false
	for (let i = 0; i < prefix.length; i += 1) {
		if (path[i] !== prefix[i]) return false
	}
	return true
}

/** Immutable flat-map update of the membership view. Returns the same map when nothing changes. */
export function updateMembership(
	instances: ReadonlyMap<string, MountedInstance>,
	storeId: StoreId,
	instance: AnyInstance | undefined,
): ReadonlyMap<string, MountedInstance> {
	const key = serializeStoreId(storeId)
	if (instance === undefined) {
		if (!instances.has(key)) return instances
		const next = new Map(instances)
		next.delete(key)
		return next
	}
	if (instances.get(key)?.instance === instance) return instances
	const next = new Map(instances)
	next.set(key, { instance, storeId })
	return next
}

/** Create the tiny internal pub/sub membership view (no store manager). */
export function createMembershipView(): MembershipView {
	const listeners = new Set<() => void>()
	let snapshot: ReadonlyMap<string, MountedInstance> = new Map()
	return {
		subscribe(listener) {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		getSnapshot() {
			return snapshot
		},
		set(next) {
			if (next === snapshot) return
			snapshot = next
			for (const listener of listeners) listener()
		},
	}
}

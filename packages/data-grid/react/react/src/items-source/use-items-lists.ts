import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

import { useSafeLayoutEffect } from '../utils/use-safe-layout-effect'

import { useItemsSourceStore } from './context'
import { labelListOf, optionsListOf, staticSnapshot } from './lists'
import { PENDING_SNAPSHOT } from './store'

import type { ItemsMeta, ListSpec } from './lists'
import type { ItemsSourceStore, SourceRequest } from './store'
import type { ItemsLists, ItemsSourceSlot, ListSnapshot } from './types'

/** One read: a column (or field) id, its meta, and where the list is read. */
export type ListRead = { id: string; meta: ItemsMeta; slot: ItemsSourceSlot }

const NO_SNAPSHOTS: readonly ListSnapshot[] = []

/** Joins store keys into the one string the subscription is keyed on. A key never contains it. */
const KEY_LIST_SEPARATOR = '\u001e'

type Planned = { options: ListSpec | undefined; labels: ListSpec | undefined }

/** Every hook the reads need, once per store key. */
function requestsOf(reads: readonly ListRead[], plans: readonly Planned[], store: ItemsSourceStore | null) {
	const byKey = new Map<string, SourceRequest>()
	if (store === null) return byKey
	plans.forEach((plan, i) => {
		const columnId = reads[i]?.id ?? ''
		for (const spec of [plan.options, plan.labels]) {
			if (spec?.useItems === undefined) continue
			byKey.set(store.keyOf(columnId, spec.owner), { columnId, owner: spec.owner, hook: spec.useItems })
		}
	})
	return byKey
}

/**
 * Reads the value lists of several columns at once, for components that resolve every filter
 * target in one pass (`useFilters`, the chips strip). A hook list keeps its source running for as
 * long as the component is mounted; a fixed list costs nothing.
 *
 * The result is positional, one {@link ItemsLists} per read.
 */
export function useItemsListsFor(reads: readonly ListRead[]): ItemsLists[] {
	const store = useItemsSourceStore()
	const plans = reads.map(
		(read): Planned => ({ options: optionsListOf(read.meta, read.slot), labels: labelListOf(read.meta, read.slot) }),
	)
	const requests = requestsOf(reads, plans, store)
	const keys = [...requests.keys()]
	// The hooks' identities are part of the signature: a new function under the same key is a new
	// hook, and the store has to hear about it to remount its runner.
	const signature =
		store === null
			? ''
			: [...requests].map(([key, request]) => `${key}#${String(store.versionOf(request.hook))}`).join('|')

	// The latest requests, for the effect below — written in a layout effect rather than during
	// render, so a render React throws away never leaves it pointing at hooks that did not commit.
	// Layout effects run before passive ones in the same commit, so the acquire always sees these.
	const requestsRef = useRef(requests)
	useSafeLayoutEffect(() => {
		requestsRef.current = requests
	})
	useEffect(() => {
		if (store === null) return undefined
		const releases = [...requestsRef.current.values()].map((request) => store.acquire(request))
		return () => {
			for (const release of releases) release()
		}
	}, [store, signature])

	const snapshots = useStoreSnapshots(store, keys.join(KEY_LIST_SEPARATOR))
	const snapshotByKey = new Map(keys.map((key, i) => [key, snapshots[i] ?? PENDING_SNAPSHOT]))

	const read = (columnId: string, spec: ListSpec | undefined): ListSnapshot | undefined => {
		if (spec === undefined) return undefined
		if (spec.useItems === undefined) return staticSnapshot(spec.items)
		if (store === null) return PENDING_SNAPSHOT
		return snapshotByKey.get(store.keyOf(columnId, spec.owner)) ?? PENDING_SNAPSHOT
	}

	return plans.map((plan, i) => {
		const columnId = reads[i]?.id ?? ''
		return { options: read(columnId, plan.options), labels: read(columnId, plan.labels) }
	})
}

/**
 * The snapshots of the keys in `keyList`, as one array that keeps its identity while none of them
 * changes. The keys arrive as one string, so the callbacks depend on exactly what they read.
 */
function useStoreSnapshots(store: ItemsSourceStore | null, keyList: string): readonly ListSnapshot[] {
	const cacheRef = useRef<readonly ListSnapshot[]>(NO_SNAPSHOTS)

	const subscribe = useCallback(
		(onChange: () => void) => {
			if (store === null || keyList === '') return () => undefined
			const unsubscribes = keyList.split(KEY_LIST_SEPARATOR).map((key) => store.subscribe(key, onChange))
			return () => {
				for (const unsubscribe of unsubscribes) unsubscribe()
			}
		},
		[store, keyList],
	)

	const getSnapshot = useCallback((): readonly ListSnapshot[] => {
		if (store === null || keyList === '') return NO_SNAPSHOTS
		const next = keyList.split(KEY_LIST_SEPARATOR).map((key) => store.getSnapshot(key))
		const cached = cacheRef.current
		if (cached.length === next.length && next.every((snapshot, i) => snapshot === cached[i])) return cached
		cacheRef.current = next
		return next
	}, [store, keyList])

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** {@link useItemsListsFor} for one column. */
export function useItemsLists(id: string, meta: ItemsMeta, slot: ItemsSourceSlot): ItemsLists {
	const [lists] = useItemsListsFor([{ id, meta, slot }])
	return lists ?? { options: undefined, labels: undefined }
}

'use client'

import { useCallback, useRef, useSyncExternalStore } from 'react'

import { pickState, readDraftDirty } from './extract-state'
import { DEFAULT_STATE_KEYS, DRAFT_STATE_KEY } from './state-keys'

import type { DataGridState, DataGridStateOptions, PersistableStateKey } from './state-keys'
import type { DataTable, GridFeatures } from '../types'
import type { TableFeatures, TableState } from '@tanstack/table-core'

type Cache = {
	keys: readonly PersistableStateKey[]
	inputs: readonly unknown[]
	output: DataGridState
}

function sameList(a: readonly unknown[], b: readonly unknown[]): boolean {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (!Object.is(a[i], b[i])) return false
	}
	return true
}

/**
 * Reactive projection of the persistable state. Subscribes to the grid store and
 * returns a referentially stable {@link DataGridState} whose identity changes only
 * when one of the included slices changes (or the `keys` list changes).
 *
 * Memoization is mandatory: `pickState` allocates a fresh object each call, so
 * returning it raw from `getSnapshot` would violate `useSyncExternalStore`'s
 * cached-snapshot contract (React would loop). We cache the last output plus the
 * per-slice input references — TanStack keeps stable references per TableState
 * field until mutated — and rebuild only when an included reference changes.
 */
export function useExtractedState<TFeatures extends TableFeatures, TRow extends object>(
	table: DataTable<TFeatures, TRow>,
	options?: DataGridStateOptions,
): DataGridState {
	const keys = options?.keys ?? DEFAULT_STATE_KEYS
	const cacheRef = useRef<Cache | null>(null)

	const select = (state: TableState<GridFeatures>): DataGridState => {
		// `draft` is not a slice: it is derived from the three deferred axes and the applied
		// snapshot, so all four go in as inputs — see `DRAFT_STATE_KEY`. The list stays
		// position-stable for a given `keys`, which is all `sameList` needs.
		const inputs: readonly unknown[] = keys.flatMap((key): unknown[] =>
			key === DRAFT_STATE_KEY
				? [state.sorting, state.columnFilters, state.globalFilter, state.applied]
				: [state[key] as unknown],
		)
		const cache = cacheRef.current
		if (cache && sameList(cache.keys, keys) && sameList(cache.inputs, inputs)) {
			return cache.output
		}
		// `isDirty()` is derived from exactly the four inputs above plus the deferral option, so
		// the cache above still gates every rebuild — see `pickDraft` for why the comparison
		// moved out of `pickState`.
		const output = pickState(state, keys, readDraftDirty(table))
		cacheRef.current = { keys, inputs, output }
		return output
	}

	// `table.store` is the grid's whole state behind one subscription, built once at construction
	// and never replaced. TanStack Store hands back a `Subscription`; React wants a teardown.
	const store = table.store
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			const subscription = store.subscribe(() => {
				onStoreChange()
			})
			return () => {
				subscription.unsubscribe()
			}
		},
		[store],
	)

	// One getter for both arguments: v9 has no server-snapshot concept, and the memo above is
	// what makes the identity stable either way.
	const read = (): DataGridState => select(store.state as TableState<GridFeatures>)
	return useSyncExternalStore(subscribe, read, read)
}

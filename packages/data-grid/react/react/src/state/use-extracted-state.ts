'use client'

import { useRef, useSyncExternalStore } from 'react'

import { pickState } from './extract-state'
import { DEFAULT_STATE_KEYS, DRAFT_STATE_KEY } from './state-keys'

import type { DataGridState, DataGridStateOptions, PersistableStateKey } from './state-keys'
import type { DataTable, TableState } from '@ez-kit/data-grid-core'

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
export function useExtractedState<TRow extends object>(
	table: DataTable<TRow>,
	options?: DataGridStateOptions,
): DataGridState {
	const keys = options?.keys ?? DEFAULT_STATE_KEYS
	const cacheRef = useRef<Cache | null>(null)

	const select = (state: TableState): DataGridState => {
		// `draft` is not a slice: it is derived from the three deferred axes and the applied
		// snapshot, so all four go in as inputs — see `DRAFT_STATE_KEY`. The list stays
		// position-stable for a given `keys`, which is all `sameList` needs.
		const inputs: readonly unknown[] = keys.flatMap((key): unknown[] =>
			key === DRAFT_STATE_KEY
				? [
						state.sorting,
						state.columnFilters,
						state.globalFilter,
						(state as unknown as Record<string, unknown>).applied,
					]
				: [state[key] as unknown],
		)
		const cache = cacheRef.current
		if (cache && sameList(cache.keys, keys) && sameList(cache.inputs, inputs)) {
			return cache.output
		}
		const output = pickState(state, keys)
		cacheRef.current = { keys, inputs, output }
		return output
	}

	return useSyncExternalStore(
		table.subscribe,
		() => select(table.getSnapshot()),
		() => select(table.getInitialSnapshot()),
	)
}

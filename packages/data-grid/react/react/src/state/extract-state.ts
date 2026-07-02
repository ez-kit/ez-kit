import { DEFAULT_STATE_KEYS } from './state-keys'

import type { DataGridState, DataGridStateOptions, PersistableStateKey } from './state-keys'
import type { Table, TableState } from '@ez-kit/data-grid-core'

/**
 * Copy one slice into the accumulator. Generic over a single key `K`: reading `state[key]`
 * with a union key widens to `any` (TanStack `TableState` indexing), so `K` keeps the value
 * typed. Skips `undefined` (exactOptionalPropertyTypes: never write `undefined`).
 * (Note: `parseState`'s `assignSlice` needs no generic — its `value` is already `unknown`.)
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function copySlice<K extends PersistableStateKey>(out: DataGridState, state: TableState, key: K): void {
	const value = state[key]
	if (value !== undefined) {
		out[key] = value
	}
}

/**
 * Pure pick of the included slices from a full TableState. Internal — the shared
 * core of {@link extractState} and the reactive hook.
 */
export function pickState(state: TableState, keys: readonly PersistableStateKey[]): DataGridState {
	const out: DataGridState = {}
	for (const key of keys) {
		copySlice(out, state, key)
	}
	return out
}

/**
 * Read the persistable slices out of a grid. Pure, synchronous, framework-agnostic
 * (takes the core `Table`, so it works outside React and against a bare `createTable`).
 * Does not touch storage. Default slice set: {@link DEFAULT_STATE_KEYS}.
 */
export function extractState<TRow extends object>(
	table: Table<TRow>,
	options?: DataGridStateOptions,
): DataGridState {
	return pickState(table.getState(), options?.keys ?? DEFAULT_STATE_KEYS)
}

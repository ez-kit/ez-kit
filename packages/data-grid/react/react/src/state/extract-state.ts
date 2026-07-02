import { DEFAULT_STATE_KEYS } from './state-keys'

import type { DataGridState, DataGridStateOptions, PersistableStateKey } from './state-keys'
import type { Table, TableState } from '@ez-kit/data-grid-core'

/**
 * Pure pick of the included slices from a full TableState. Internal — the shared
 * core of {@link extractState} and the reactive hook. Skips slices whose value is
 * `undefined` (exactOptionalPropertyTypes: never write `undefined` into the result).
 */
export function pickState(state: TableState, keys: readonly PersistableStateKey[]): DataGridState {
	const out: DataGridState = {}
	for (const key of keys) {
		const value = state[key]
		if (value !== undefined) {
			;(out as Record<string, unknown>)[key] = value
		}
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

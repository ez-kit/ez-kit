import { DEFAULT_STATE_KEYS, DRAFT_STATE_KEY } from './state-keys'

import type { DataGridState, DataGridStateOptions, PersistableSliceKey, PersistableStateKey } from './state-keys'
import type { AppliedState, Table, TableState } from '@ez-kit/data-grid-core'

/**
 * Copy one slice into the accumulator. Generic over a single key `K`: reading `state[key]`
 * with a union key widens to `any` (TanStack `TableState` indexing), so `K` keeps the value
 * typed. Skips `undefined` (exactOptionalPropertyTypes: never write `undefined`).
 * (Note: `parseState`'s `assignSlice` needs no generic — its `value` is already `unknown`.)
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function copySlice<K extends PersistableSliceKey>(out: DataGridState, state: TableState, key: K): void {
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
		if (key === DRAFT_STATE_KEY) {
			const draft = pickDraft(state)
			if (draft !== undefined) out.draft = draft
			continue
		}
		copySlice(out, state, key)
	}
	return out
}

/**
 * The pending draft, or `undefined` when there is none to persist — `draft` is off (no
 * `applied` snapshot) or nothing differs from it.
 *
 * Reads the live axes rather than a `state.draft` slice, because there is no such slice: under
 * deferral the live axes *are* the draft and `applied` is the emitted query. See
 * {@link DRAFT_STATE_KEY}.
 */
function pickDraft(state: TableState): Partial<AppliedState> | undefined {
	// `applied` is declared non-optional on `TableState`, but it is only ever written by the
	// draft feature — a grid that never enabled `draft` has no such key at runtime.
	const applied = (state as unknown as Record<string, unknown>).applied as AppliedState | undefined
	if (applied === undefined) return undefined
	const isClean =
		applied.sorting === state.sorting &&
		applied.columnFilters === state.columnFilters &&
		applied.globalFilter === state.globalFilter
	if (isClean) return undefined
	return { sorting: state.sorting, columnFilters: state.columnFilters, globalFilter: state.globalFilter }
}

/**
 * Read the persistable slices out of a grid. Pure, synchronous, framework-agnostic
 * (takes the core `Table`, so it works outside React and against a bare `createTable`).
 * Does not touch storage. Default slice set: {@link DEFAULT_STATE_KEYS}.
 */
export function extractState<TRow extends object>(table: Table<TRow>, options?: DataGridStateOptions): DataGridState {
	return pickState(table.getState(), options?.keys ?? DEFAULT_STATE_KEYS)
}

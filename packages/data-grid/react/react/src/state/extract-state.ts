import { DEFAULT_STATE_KEYS, DRAFT_STATE_KEY } from './state-keys'

import type { DataGridState, DataGridStateOptions, PersistableSliceKey, PersistableStateKey } from './state-keys'
import type { GridFeatures } from '../types'
import type { AppliedState, DataTable as CoreDataTable, DraftApi } from '@ez-kit/data-grid-core'
import type { TableFeatures, TableState } from '@tanstack/table-core'

/**
 * Copy one slice into the accumulator. Generic over a single key `K`: reading `state[key]`
 * with a union key widens to `any` (TanStack `TableState` indexing), so `K` keeps the value
 * typed. Skips `undefined` (exactOptionalPropertyTypes: never write `undefined`).
 * (Note: `parseState`'s `assignSlice` needs no generic — its `value` is already `unknown`.)
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function copySlice<K extends PersistableSliceKey>(out: DataGridState, state: TableState<GridFeatures>, key: K): void {
	const value = state[key]
	if (value !== undefined) {
		out[key] = value
	}
}

/**
 * Pure pick of the included slices from a full TableState. Internal — the shared
 * core of {@link extractState} and the reactive hook.
 */
export function pickState(
	state: TableState<GridFeatures>,
	keys: readonly PersistableStateKey[],
	isDraftDirty: boolean,
): DataGridState {
	const out: DataGridState = {}
	for (const key of keys) {
		if (key === DRAFT_STATE_KEY) {
			if (isDraftDirty) out.draft = pickDraft(state)
			continue
		}
		copySlice(out, state, key)
	}
	return out
}

/**
 * The pending draft — the three live axes as they stand.
 *
 * Reads the live axes rather than a `state.draft` slice, because there is no such slice: under
 * deferral the live axes *are* the draft and `applied` is the emitted query. See
 * {@link DRAFT_STATE_KEY}.
 *
 * Whether there *is* a draft to persist is the caller's `isDraftDirty`, not a comparison made
 * here, and that moved in the v9 migration. This function used to read `state.applied`, treat
 * its absence as "deferral off", and compare the three axes to it by reference. Neither half
 * survives v9: `applied` is seeded by `draftFeature.getInitialState` and so is present whenever
 * the feature is **registered** — `draft: false` included — and the axes' initial values are
 * separately-created defaults, so a brand-new grid compares unequal to its own applied snapshot
 * (probed: `applied.sorting !== state.sorting` with both `[]`). Together they reported a pending
 * draft for every grid whose feature set includes `draftFeature`. `table.draft.isDirty()` is the
 * answer core already owns — it compares by value and returns `false` when deferral is off — and
 * is what `<DraftBar>` and `<SelectionBar>` in this package already ask.
 */
function pickDraft(state: TableState<GridFeatures>): Partial<AppliedState> {
	return { sorting: state.sorting, columnFilters: state.columnFilters, globalFilter: state.globalFilter }
}

/**
 * `table.draft.isDirty()`, or `false` for a table without the feature.
 *
 * `draft` is declared optional on {@link ExtractableTable} rather than picked off core's table:
 * the member exists **iff** `draftFeature` is registered, and this function is documented to take
 * a bare `createTable` with any feature set.
 */

/**
 * The part of a table {@link extractState} reads: one member, `store`.
 *
 * Was `getState`, which v9 deleted (pr1-outcomes §2.3). `table.store.state` is the whole current
 * snapshot and the non-reactive read of it — this function subscribes to nothing.
 *
 * Structural rather than `Table<TFeatures, TRow>`, and that is forced by Task 14's split. This
 * package's own {@link DataTable} is `Omit<CoreDataTable, 'grid'> & { grid: ResolvedGridOptions }`,
 * so it is **not** assignable to core's `Table` and core's is not assignable to it — naming either
 * one here would reject the other, while this function is documented to take both (a grid from
 * `useDataGrid`, and a bare `createTable` outside React). `Pick` off core's table keeps both type
 * parameters meaningful and states exactly what is read, the way core's own `StateHandlerTable`
 * does at its boundary.
 */
export type ExtractableTable<TFeatures extends TableFeatures, TRow extends object> = Pick<
	CoreDataTable<TFeatures, TRow>,
	'store'
> & {
	/** Present only with `draftFeature` registered — see {@link readDraftDirty}. */
	draft?: DraftApi | undefined
}

/**
 * `table.draft.isDirty()`, or `false` for a table without the feature.
 *
 * `draft` is declared optional on {@link ExtractableTable} rather than picked off core's table:
 * the member exists **iff** `draftFeature` is registered, and `extractState` is documented to
 * take a bare `createTable` with any feature set. Exported because `useExtractedState` needs the
 * same answer and cannot name `draft` on an unresolved `TFeatures`.
 */
export function readDraftDirty<TFeatures extends TableFeatures, TRow extends object>(
	table: ExtractableTable<TFeatures, TRow>,
): boolean {
	return table.draft?.isDirty() ?? false
}

/**
 * Read the persistable slices out of a grid. Pure, synchronous, framework-agnostic
 * (takes anything with a `store`, so it works outside React and against a bare `createTable`).
 * Does not touch storage. Default slice set: {@link DEFAULT_STATE_KEYS}.
 *
 * The one cast: `TableState<TFeatures>` narrows to the caller's registered slices, while
 * {@link DataGridState} is picked from the widest instantiation (see {@link DataGridState} for
 * why it cannot be generic). Reading a slice the caller did not register yields `undefined`, and
 * `pickState` already skips `undefined` — which is the same accepted cost {@link GridFeatures}
 * records.
 */
export function extractState<TFeatures extends TableFeatures, TRow extends object>(
	table: ExtractableTable<TFeatures, TRow>,
	options?: DataGridStateOptions,
): DataGridState {
	return pickState(
		table.store.state as TableState<GridFeatures>,
		options?.keys ?? DEFAULT_STATE_KEYS,
		readDraftDirty(table),
	)
}

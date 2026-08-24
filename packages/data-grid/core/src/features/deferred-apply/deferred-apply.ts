import type {
	ColumnFiltersState,
	InitialTableState,
	RowData,
	SortingState,
	Table,
	TableFeature,
	TableState,
} from '@tanstack/table-core'

/** The three query axes whose application can be deferred. */
export type DraftAxis = 'sorting' | 'columnFilters' | 'globalFilter'

/**
 * Snapshot of the query the consumer last saw. The live `sorting` /
 * `columnFilters` / `globalFilter` slices hold what the user is composing;
 * this holds what was actually emitted. The difference between the two is the
 * draft.
 */
export type AppliedState = {
	sorting: SortingState
	columnFilters: ColumnFiltersState
	globalFilter: unknown
}

/** What `table.draft.get()` returns — the live values of the three axes. */
export type QueryDraft = AppliedState

export type PendingCount = {
	sorting: number
	filters: number
	search: boolean
}

export type DraftApi = {
	get: () => QueryDraft
	set: (next: Partial<QueryDraft>) => void
	isDirty: () => boolean
	getPendingCount: () => PendingCount
	apply: () => void
	reset: () => void
	resetAxis: (axis: DraftAxis) => void
}

declare module '@tanstack/table-core' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState {
		applied: AppliedState
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface InitialTableState {
		/** Restored draft — seeds the live axes on top of the applied seed. */
		draft?: Partial<AppliedState>
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table<TData extends RowData> {
		draft: DraftApi
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface TableOptionsResolved<TData extends RowData> {
		/**
		 * Mirrors `TableConfig.deferredApply`. Present only when deferral is on, so a
		 * UI layer can gate on the option itself rather than inferring it from state.
		 */
		deferredApply?: boolean
	}
}

/** Reference-and-value comparison good enough for the three axes we track. */
function sameAxis(a: unknown, b: unknown): boolean {
	if (a === b) return true
	return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

/** Key of the applied-snapshot slice on `TableState` — never part of an outward emission. */
export const APPLIED_STATE_KEY = 'applied'

export const DEFAULT_APPLIED_STATE: AppliedState = {
	sorting: [],
	columnFilters: [],
	globalFilter: undefined,
}

export const DeferredApplyFeature: TableFeature<RowData> = {
	// `initialState.sorting` (and friends) seed the APPLIED snapshot — a grid given
	// an initial sort must not be born dirty. `initialState.draft` seeds the live
	// slices on top, which is how a draft restored from storage comes back pending.
	getInitialState: (state?: InitialTableState) => {
		const seed = state as (Partial<TableState> & { draft?: Partial<AppliedState> }) | undefined
		const applied: AppliedState = {
			sorting: seed?.sorting ?? DEFAULT_APPLIED_STATE.sorting,
			columnFilters: seed?.columnFilters ?? DEFAULT_APPLIED_STATE.columnFilters,
			globalFilter: seed?.globalFilter,
		}
		const { draft, ...rest } = seed ?? {}
		return {
			...rest,
			applied,
			sorting: draft?.sorting ?? applied.sorting,
			columnFilters: draft?.columnFilters ?? applied.columnFilters,
			globalFilter: draft !== undefined && 'globalFilter' in draft ? draft.globalFilter : applied.globalFilter,
		}
	},

	createTable: (table: Table<RowData>) => {
		const get = (): QueryDraft => {
			const s = table.getState()
			return { sorting: s.sorting, columnFilters: s.columnFilters, globalFilter: s.globalFilter }
		}

		const isDirty = (): boolean => {
			const { applied } = table.getState()
			const live = get()
			return (
				!sameAxis(live.sorting, applied.sorting) ||
				!sameAxis(live.columnFilters, applied.columnFilters) ||
				!sameAxis(live.globalFilter, applied.globalFilter)
			)
		}

		const getPendingCount = (): PendingCount => {
			const { applied } = table.getState()
			const live = get()
			const changedFilters = live.columnFilters.filter(
				(f) =>
					!sameAxis(
						f,
						applied.columnFilters.find((a) => a.id === f.id),
					),
			).length
			const removedFilters = applied.columnFilters.filter((a) => !live.columnFilters.some((f) => f.id === a.id)).length
			const changedSorts = live.sorting.filter((s, i) => !sameAxis(s, applied.sorting[i])).length
			const removedSorts = Math.max(applied.sorting.length - live.sorting.length, 0)
			return {
				sorting: changedSorts + removedSorts,
				filters: changedFilters + removedFilters,
				search: !sameAxis(live.globalFilter, applied.globalFilter),
			}
		}

		const set = (next: Partial<QueryDraft>): void => {
			table.setState((state) => ({
				...state,
				...(next.sorting !== undefined ? { sorting: next.sorting } : {}),
				...(next.columnFilters !== undefined ? { columnFilters: next.columnFilters } : {}),
				...('globalFilter' in next ? { globalFilter: next.globalFilter } : {}),
			}))
		}

		// One `setState` on purpose: the pageIndex reset, the selection clear and the
		// snapshot move must land in a single state change, or the funnel emits twice
		// and the consumer fires two requests — the exact thing this feature exists
		// to prevent.
		const apply = (): void => {
			table.setState((state) => ({
				...state,
				applied: {
					sorting: state.sorting,
					columnFilters: state.columnFilters,
					globalFilter: state.globalFilter,
				},
				pagination: { ...state.pagination, pageIndex: 0 },
				rowSelection: {},
			}))
		}

		const reset = (): void => {
			table.setState((state) => ({
				...state,
				sorting: state.applied.sorting,
				columnFilters: state.applied.columnFilters,
				globalFilter: state.applied.globalFilter,
			}))
		}

		const resetAxis = (axis: DraftAxis): void => {
			table.setState((state) => ({ ...state, [axis]: state.applied[axis] }))
		}

		table.draft = { get, set, isDirty, getPendingCount, apply, reset, resetAxis }
	},
}

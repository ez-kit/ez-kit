/* eslint-disable @typescript-eslint/no-unnecessary-type-arguments */
import type { ColumnDef, SortingFn } from './column/types'
import type { CreatingConfig } from './features/creating'
import type { DeletingConfig } from './features/deleting'
import type { EditingConfig } from './features/editing'
import type { FilterOperatorDef } from './features/operators'
import type { RowActionsConfig } from './features/row-actions'
import type { SetStateOptions } from './store/store'
import type { FeatureToggle } from './utils/feature-flag'
import type {
	Column,
	ColumnFiltersState,
	FilterFn,
	PaginationState,
	Row,
	RowData,
	RowModel,
	Table as TanStackTable,
	TableOptionsResolved,
	TableState,
	Updater,
} from '@tanstack/table-core'

export type { SortingFn } from './column/types'
export type { TableState as TableSnapshot }

/** Single sort entry: column id + direction. Order in the array = sort priority for multi-sort. */
export type SortingStateEntry = { id: string; desc: boolean }
/** Ordered list of sorts. Maps 1:1 to TanStack `state.sorting`. */
export type SortingState = SortingStateEntry[]

/**
 * Gesture that engages multi-column sort.
 * - `'shift'` — shift+click adds the column (TanStack default)
 * - `'ctrl'`  — ctrl+click (or ⌘+click on macOS) adds the column
 * - `'always'` — every click extends the multi-sort set
 */
export type MultiSortEvent = 'shift' | 'ctrl' | 'always'

export type MultiSortConfig = {
	/** Cap on simultaneously sorted columns. Unlimited by default. */
	max?: number
	/** Gesture that engages multi-sort. Default: `'shift'`. */
	event?: MultiSortEvent
	/** Allow removing a single column from the multi-sort set. Default: true. */
	removable?: boolean
}

/**
 * Table-level sorting config.
 *
 * @example Multi-sort capped at 3 columns, ctrl-click
 * ```ts
 * createTable({
 *   data, columns,
 *   sorting: { multi: { max: 3, event: 'ctrl' } },
 * })
 * ```
 *
 * @example Server-side sorting
 * ```ts
 * createTable({
 *   data, columns,
 *   sorting: { manual: true, onChange: (sort) => fetchPage({ sort }) },
 * })
 * ```
 *
 * @example Named sort functions, referenced from `column.sorting.fn`
 * ```ts
 * createTable({
 *   data,
 *   columns: [{ accessorKey: 'priority', sorting: { fn: 'priorityOrder' } }],
 *   sorting: {
 *     fns: { priorityOrder: (a, b, id) => RANK[a.getValue(id)] - RANK[b.getValue(id)] },
 *   },
 * })
 * ```
 */
export type SortingConfig = FeatureToggle & {
	/**
	 * Server-side mode: skip TanStack's sorted row model and rely on externally sorted `data`.
	 *
	 * @example
	 * ```ts
	 * sorting: {
	 *   manual: true,
	 *   onChange: (sort) => fetchUsers({ sort }),
	 * }
	 * ```
	 */
	manual?: boolean
	/** First click sorts descending. Default: false. */
	descFirst?: boolean
	/** Allow a third click to clear the sort. Default: true. */
	removable?: boolean
	/**
	 * Multi-column sort. `false` (default) = single-column only. `true` = enabled with defaults.
	 *
	 * @example Cap at 2 columns, hold ⌘/Ctrl to extend
	 * ```ts
	 * sorting: { multi: { max: 2, event: 'ctrl' } }
	 * ```
	 */
	multi?: boolean | MultiSortConfig
	/**
	 * Named sort functions, addressable from `column.sorting.fn` by id.
	 *
	 * @example
	 * ```ts
	 * sorting: {
	 *   fns: {
	 *     priorityRank: (a, b, id) => RANK[a.getValue(id)] - RANK[b.getValue(id)],
	 *   },
	 * }
	 * ```
	 */
	fns?: Record<string, SortingFn>
	/**
	 * Called whenever sort state changes. Receives the resolved {@link SortingState}.
	 *
	 * @example
	 * ```ts
	 * sorting: { onChange: (sort) => router.push({ query: { sort } }) }
	 * ```
	 */
	onChange?: (sorting: SortingState) => void
}

export type FilteringConfig = FeatureToggle & {
	manual?: boolean
	/** Table-level custom operators (or built-in overrides). Referenced by column items by ID. */
	operators?: FilterOperatorDef[]
	/**
	 * Enable faceted row models (unique values + counts) for columns that opt in via
	 * `column.filtering.faceted` or for all filterable columns when `true`. Used by
	 * multi-select filters to display per-option counts. Default: false (no faceted
	 * row models attached — keeps `@tanstack/table-core` tree-shakable).
	 */
	faceted?: boolean
	/**
	 * Called whenever the column-filters state changes. Receives the resolved
	 * {@link ColumnFiltersState}. Use this to mirror filter state into the URL
	 * or fetch server-side filtered data.
	 *
	 * @example
	 * ```ts
	 * filtering: { onChange: (filters) => router.push({ query: { filters } }) }
	 * ```
	 */
	onChange?: (columnFilters: ColumnFiltersState) => void
}

/**
 * Global filter function signature. Compatible with TanStack `FilterFn`.
 * Receives the row, the column id being inspected, the user-entered value, and
 * an `addMeta` callback for stashing match metadata (e.g. for highlighting).
 */
export type GlobalFilterFn<TRow extends RowData = RowData> = FilterFn<TRow>

/**
 * Table-level global search (cross-column) config.
 *
 * @example Enable with default `includesString` substring match
 * ```ts
 * createTable({ data, columns, globalFiltering: true })
 * ```
 *
 * @example Provide a custom inline filter function
 * ```ts
 * createTable({
 *   data, columns,
 *   globalFiltering: {
 *     fn: (row, columnId, value) =>
 *       String(row.getValue(columnId)).toLowerCase().includes(String(value).toLowerCase()),
 *   },
 * })
 * ```
 *
 * @example Reference a function from the registry by id
 * ```ts
 * createTable({
 *   data, columns,
 *   globalFiltering: {
 *     fns: { fuzzy: rankItem },
 *     fn: 'fuzzy',
 *   },
 * })
 * ```
 */
export type GlobalFilteringConfig = FeatureToggle & {
	/**
	 * Function applied during global search.
	 * - `string` — resolved against {@link GlobalFilteringConfig.fns} registry first,
	 *   then against TanStack's built-in filter fns (`'includesString'`, etc.).
	 * - {@link GlobalFilterFn} — used inline.
	 *
	 * Default: `'includesString'` (case-insensitive substring).
	 */
	fn?: string | GlobalFilterFn
	/**
	 * Named global filter functions, addressable from {@link GlobalFilteringConfig.fn} by id.
	 */
	fns?: Record<string, GlobalFilterFn>
	/**
	 * Called whenever the global-search value changes. Receives the current
	 * global filter (typically a string). Use this to mirror search state into
	 * the URL or fetch server-side data.
	 *
	 * @example
	 * ```ts
	 * globalFiltering: { onChange: (q) => router.push({ query: { q } }) }
	 * ```
	 */
	onChange?: (globalFilter: unknown) => void
}

/**
 * Direction of an infinite-scroll load.
 * - `'forward'` — load the next page (scroll down / append). Implemented.
 * - `'backward'` — load the previous page (scroll up / prepend). **Reserved for v2**:
 *   the type exists so the API can grow without a breaking change; v1 only ever emits
 *   `'forward'` and performs no scroll-anchoring.
 */
export type LoadMoreDirection = 'forward' | 'backward'

/**
 * Infinite-scroll request status, held in `state.infinite`. **100% grid-owned** —
 * every field is written only by the grid (the React layer via `setInfiniteStatus`
 * around the `onLoadMore` promise). The user-owned descriptor `hasNextPage` lives in
 * {@link PaginationConfig} (it describes server data, like `pageCount`/`rowCount`), not
 * here — so this slice never mixes ownership.
 *
 * `*Previous*` fields are reserved for v2 (backward / prepend); inert in v1.
 */
export type InfiniteState = {
	isFetchingNextPage: boolean
	isFetchingPreviousPage: boolean
	error: { direction: LoadMoreDirection; error: unknown } | null
}

/**
 * Loading-status slice, held in `state.loading`. **User-owned / fully controlled** —
 * the consumer feeds every field through the controlled `table.state.loading` prop
 * (mirrored one-way by `syncControlledState`). The grid **never writes** this slice;
 * there is no single-writer setter and no grid-owned derived alias. Typically fed
 * straight from a data library's query status (React Query / SWR) or local `useState`.
 *
 * Rendering intent per field (the grid derives what to show from these):
 * - `isPending` — no data yet (first load) → full-body **skeleton**.
 * - `isFetching` — a background refetch is in flight while data is already on screen
 *   → **refetch overlay**.
 * - `isError` / `error` — the last load/refetch failed → **error status**, read from
 *   the store to render a fallback (`isError` is the flag, `error` the thrown value).
 *
 * Incremental infinite-scroll status lives separately in {@link InfiniteState}.
 */
export type LoadingState = {
	isPending: boolean
	isFetching: boolean
	isError: boolean
	error: unknown
}

export type PaginationConfig = FeatureToggle & {
	manual?: boolean
	/**
	 * Server total-rows descriptor. When set in manual pagination mode, TanStack
	 * derives `pageCount` automatically from `rowCount` ÷ `pageSize` (ceiling).
	 * `table.getRowCount()` returns this value.
	 *
	 * Supply EITHER `pageCount` (page total, already divided) OR `rowCount` (raw
	 * server row total, let TanStack divide) — not both.
	 */
	rowCount?: number
	pageCount?: number
	pageSize?: number
	/**
	 * Called whenever the pagination state changes (page index or size). Receives
	 * the resolved {@link PaginationState}. Use this to mirror state into the URL
	 * or fetch the next page from the server.
	 *
	 * @example
	 * ```ts
	 * pagination: {
	 *   manual: true,
	 *   onChange: ({ pageIndex, pageSize }) => fetchPage({ pageIndex, pageSize }),
	 * }
	 * ```
	 */
	onChange?: (pagination: PaginationState) => void
	/**
	 * Pagination mode. `'pages'` (default) renders a classic page footer. `'infinite'`
	 * enables infinite scroll — mutually exclusive with the page footer. In infinite
	 * mode the grid is **event-only**: it calls {@link PaginationConfig.onLoadMore} when a
	 * load edge is reached, and the consumer appends rows via `table.appendData(rows)`.
	 */
	mode?: 'pages' | 'infinite'
	/**
	 * Infinite mode only. Controlled flag declaring whether more rows can be loaded
	 * forward (scroll down). A **server-data descriptor** (like `pageCount`/`rowCount`),
	 * so it is an option, not table state — only the consumer's API knows it. The React
	 * layer reads it reactively to drive the loader / load-more control.
	 */
	hasNextPage?: boolean
	/**
	 * Infinite mode only. **Reserved for v2** (backward / prepend). Inert in v1.
	 */
	hasPreviousPage?: boolean
	/**
	 * Infinite mode only. Called when a load edge is reached (auto trigger) or the
	 * "Load more" control is activated (manual trigger). Fetch the page and append rows
	 * with `table.appendData(rows)`. The returned promise drives `isFetchingNextPage`;
	 * a rejection surfaces `state.infinite.error` with a retry affordance. v1 always
	 * passes `direction: 'forward'`.
	 *
	 * Prefer returning a promise so the loading indicator tracks the real request.
	 * A `void` return still flips `isFetchingNextPage` on, then off on the next
	 * microtask — so a synchronous handler shows a brief spinner flash.
	 */
	onLoadMore?: (ctx: { direction: LoadMoreDirection }) => Promise<void> | void
}

export type SelectionConfig = FeatureToggle & {
	/** Called when row selection changes. */
	onChange?: (rowIds: string[]) => void
	/** Allow selecting multiple rows. Default: true. */
	multiple?: boolean
}

/**
 * What expanding *does* — not how it looks, hence `mode` rather than `variant`.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `mode: 'tree'` is equally valid and needs no import.
 */
export const ExpandingMode = {
	/** Each row can open a detail panel rendered below it. The default. */
	SubContent: 'sub-content',
	/** Rows nest: sub-rows are extracted from the row itself and indented under their parent. */
	Tree: 'tree',
} as const

export type ExpandingMode = (typeof ExpandingMode)[keyof typeof ExpandingMode]

/**
 * Expanding config, generic over the type of {@link ExpandingConfig.renderExpanded}.
 *
 * `TRenderExpanded` exists so an adapter can narrow the one framework-bound field without
 * restating the rest of the config. The React adapter's `ReactExpandingConfig<TRow>` is
 * nothing but `ExpandingConfig<TRow, ComponentType<ExpandedRowProps<TRow>>>`, so a field
 * added here reaches React automatically — the hand-copied React twin this replaced could
 * only ever drift.
 */
export type ExpandingConfig<TRow extends object = object, TRenderExpanded = unknown> = FeatureToggle & {
	/** What expanding does. Default: {@link ExpandingMode.SubContent}. */
	mode?: ExpandingMode
	/** Tree mode: sub-row extractor. Auto-detects `row.children` when omitted. */
	getSubRows?: (row: TRow, index: number) => TRow[] | undefined
	/**
	 * Sub-content mode: per-row expandability callback.
	 * When omitted and `renderExpanded` is provided, every row is expandable.
	 */
	getRowCanExpand?: (row: Row<TRow>) => boolean
	/**
	 * Sub-content mode: the detail-panel renderer.
	 *
	 * Defaults to `unknown` here — core is framework-agnostic and never calls it, it only
	 * carries it through to whichever adapter mounts the panel.
	 */
	renderExpanded?: TRenderExpanded
}

export type RowPinningConfig = {
	top?: boolean
	bottom?: boolean
}

export type PinningConfig = FeatureToggle & {
	/** Enable column pin UI (ColumnMenu in headers). */
	column?: boolean
	/** Enable row pinning. `true` = top+bottom, or fine-grained RowPinningConfig. */
	row?: boolean | RowPinningConfig
}

export type RowVirtualOptions = {
	/** Estimated row height in px used by the virtualizer. Default: 50. */
	estimateSize?: number | ((index: number) => number)
	/** Extra rows rendered outside the visible viewport. Default: 5. */
	overscan?: number
}

export type VirtualizedConfig = FeatureToggle & {
	row?: boolean | RowVirtualOptions
	// column virtualization — reserved for future
}

export type ColumnResizeMode = 'onChange' | 'onEnd'
export type ColumnResizeDirection = 'ltr' | 'rtl'

export type ResizingConfig = FeatureToggle & {
	/** Resize mode. 'onChange' updates live; 'onEnd' updates after mouse release. Default: 'onChange'. */
	mode?: ColumnResizeMode
	/** Text direction for resize calculation. Default: 'ltr'. */
	direction?: ColumnResizeDirection
}

/**
 * Seedable subset of {@link TableState} for {@link TableConfig.initialState}.
 *
 * Excludes `editing`, `creating`, `pendingDeleteRowId` and `pendingBulkDelete` — these are
 * transient per-open-form/dialog state that each feature re-initialises whenever it opens
 * (`creating.start()`, an edit start, a delete request), hard-resetting to its own defaults and
 * ignoring whatever was seeded. Seeding "start already editing/creating/deleting" is not a
 * meaningful thing to express, so it's forbidden at the type level rather than silently ignored
 * at runtime. To seed values for a create form, use {@link CreatingConfig.defaultValues} (table
 * level) or a column's `creating.defaultValue` (per-column), not `initialState`.
 */
export type InitialTableState = Omit<
	Partial<TableState>,
	'editing' | 'creating' | 'pendingDeleteRowId' | 'pendingBulkDelete'
>

export type TableConfig<TRow extends object> = {
	data: TRow[]
	columns: ColumnDef<TRow>[]

	/**
	 * Returns a stable string ID for a row.
	 * Defaults to `row.id` when present, otherwise falls back to the array index.
	 */
	getRowId?: (row: TRow, index: number) => string

	/**
	 * Sorting configuration. Falsy (`undefined` or `false`) fully disables sorting:
	 * UI affordances are not rendered and `getSortedRowModel` is not attached,
	 * regardless of per-column sorting config. Truthy (`true` or object) enables it
	 * and per-column overrides apply.
	 */
	sorting?: boolean | SortingConfig
	/**
	 * Column-level filtering configuration. Falsy fully disables column filters
	 * (per-column inputs / operator popovers); truthy enables them. Independent
	 * from {@link TableConfig.globalFiltering} — global search is configured separately.
	 */
	filtering?: boolean | FilteringConfig
	/**
	 * Global search configuration — cross-column text search backed by a single
	 * filter function. Independent from {@link TableConfig.filtering}: you can
	 * enable global search without column filters, or vice versa, or both.
	 *
	 * - `true` — enable with defaults (`includesString` substring match)
	 * - {@link GlobalFilteringConfig} — fine-grained control
	 * - `false` / omitted — disabled
	 */
	globalFiltering?: boolean | GlobalFilteringConfig
	pagination?: boolean | PaginationConfig
	selection?: boolean | SelectionConfig
	expanding?: boolean | ExpandingConfig<TRow>
	/**
	 * Column visibility (hide/show columns). `false` / omitted disables hiding for all
	 * columns; `true` enables it (per-column `visibility` controls still apply).
	 *
	 * A plain boolean on purpose: core has no knobs of its own here, it only gates
	 * `enableHiding`. The UI config (e.g. the toolbar button) is a React concern and
	 * lives on the adapter's `ColumnVisibilityUIConfig`, which passes only the resolved
	 * boolean down. Typing this `boolean | object` instead would let any misspelled key
	 * through unchecked.
	 */
	columnVisibility?: boolean
	/**
	 * Pinning configuration. Column pinning and row pinning are gated independently:
	 * - `true` — enable column menu UI + row pin top+bottom
	 * - `{ column: true }` — column menu only
	 * - `{ row: { top: true } }` — row pin top only
	 * - `false` / omitted — no pinning at all
	 */
	pinning?: boolean | PinningConfig
	virtualized?: boolean | VirtualizedConfig
	creating?: CreatingConfig<TRow>
	editing?: EditingConfig<TRow>
	deleting?: DeletingConfig<TRow>
	/**
	 * Defer application of sorting, column filters and global search. While on,
	 * those three axes accumulate as a draft and reach `onStateChange` only when
	 * `table.draft.apply()` runs — one state change, one request, instead of one
	 * per keystroke. Requires `manual: true` on at least one of the three.
	 */
	deferredApply?: boolean
	/**
	 * Layout of the per-row actions column (`__actions__`), which holds edit,
	 * delete and the row-pin menu. The column is injected automatically as soon
	 * as any of {@link TableConfig.editing}, {@link TableConfig.deleting} or row
	 * pinning is enabled; this only controls how those actions are presented.
	 */
	rowActions?: RowActionsConfig
	/**
	 * Column resizing. Named to match the per-column `resizing` switch — one feature, one
	 * name at both levels.
	 */
	resizing?: boolean | ResizingConfig
	/**
	 * Seed values for table state at construction (TanStack-style). Merged over the
	 * grid's computed defaults; consumer values win. Use for uncontrolled initial
	 * state, e.g. `initialState: { loading: { isPending: true, isFetching: false, isError: false, error: null } }`
	 * or a default sort.
	 *
	 * Cannot seed `editing`, `creating`, `pendingDeleteRowId` or `pendingBulkDelete` — see
	 * {@link InitialTableState} for why. To seed create-form values use
	 * {@link TableConfig.creating}'s `defaultValues`, or a column's `creating.defaultValue`.
	 */
	initialState?: InitialTableState
	/**
	 * Called whenever the table state changes (sorting, filtering, pagination, etc.).
	 * Receives the **resolved** next state — assign it to your own state to implement
	 * controlled mode.
	 *
	 * Under {@link TableConfig.deferredApply} this fires only when the query the consumer
	 * is allowed to see actually changes: draft edits stay silent, and the state handed
	 * over carries the applied snapshot on `sorting` / `columnFilters` / `globalFilter`
	 * rather than the pending draft.
	 * @example
	 * const [tableState, setTableState] = useState<Partial<TableState>>({})
	 * useDataGrid({ ..., state: tableState, onStateChange: (state) => setTableState(state) })
	 */
	onStateChange?: (state: TableState) => void
}

/**
 * Extended TanStack table instance returned by createTable().
 * Adds subscribe/getSnapshot for useSyncExternalStore, setData/appendData, and
 * the infinite-scroll status setters (see {@link InfiniteState}).
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface DataTable<TRow extends RowData> extends TanStackTable<TRow> {
	options: TableOptionsResolved<TRow>
	getState: () => TableState
	getRowModel: () => RowModel<TRow>
	getAllColumns: () => Column<TRow, unknown>[]
	getColumn: (columnId: string) => Column<TRow, unknown> | undefined
	getRow: (id: string, searchAll?: boolean) => Row<TRow>
	initialState: TableState
	setOptions: (newOptions: Updater<TableOptionsResolved<TRow>>) => void
	setState: (updater: Updater<TableState>) => void
	/** Subscribe to all state changes. Returns an unsubscribe function. */
	subscribe: (listener: () => void) => () => void
	/** Returns a stable snapshot of current state for useSyncExternalStore. */
	getSnapshot: () => TableState
	/** Reactively replace the data array. */
	setData: (data: TRow[]) => void
	/**
	 * Reactively append rows after the current data (immutable — builds a new array,
	 * leaves the previous one untouched). Primary helper for forward infinite scroll.
	 */
	appendData: (rows: TRow[]) => void
	/**
	 * Reactively prepend rows before the current data (immutable). Exists for the
	 * **reserved** v2 backward/prepend direction; usable now, but the grid performs no
	 * scroll-anchoring in v1, so the scroll position is not compensated.
	 */
	prependData: (rows: TRow[]) => void
	/**
	 * Push a partial controlled-state slice into both TanStack's `options.state`
	 * and the external snapshot store, **without** firing `onStateChange`.
	 *
	 * Use this when the caller is the source of truth (`state` prop on the
	 * React `useDataGrid` hook). Calling `setState` instead would loop back
	 * through `config.onStateChange` and risk an infinite update when the
	 * consumer mirrors that callback into React state.
	 *
	 * Pass `{ silent: true }` when syncing from inside a React render pass: the
	 * write still lands (so the very render that syncs reads the new values), but
	 * subscribers are not woken mid-render — pair it with
	 * {@link DataTable.notifyStateSubscribers} from a layout effect.
	 */
	syncControlledState: (partial: Partial<TableState>, options?: SetStateOptions) => void
	/**
	 * Call every state subscriber with the current snapshot. Exists to flush a
	 * {@link DataTable.syncControlledState} write made with `{ silent: true }`.
	 */
	notifyStateSubscribers: () => void
}

/** Public alias. */
export type Table<TRow extends object> = DataTable<TRow>

/* eslint-disable @typescript-eslint/no-unnecessary-type-arguments */
import type { ColumnDef, SortingFn, SystemColumnDef } from './column/types'
import type { CreatingConfig } from './features/creating'
import type { DraftConfig } from './features/deferred-apply'
import type { DeletingConfig } from './features/deleting'
import type { EditingConfig } from './features/editing'
import type { FilterOperatorDef } from './features/operators'
import type { RowActionsConfig } from './features/row-actions'
import type { SetStateOptions } from './store/store'
import type { FeatureToggle } from './utils/feature-flag'
import type {
	Column,
	ColumnFiltersState,
	ColumnPinningState,
	ColumnSizingState,
	ExpandedState,
	FilterFn,
	PaginationState,
	RowPinningState,
	RowSelectionState,
	Row,
	RowData,
	RowModel,
	Table as TanStackTable,
	TableOptionsResolved,
	TableState,
	Updater,
	VisibilityState,
} from '@tanstack/table-core'

export type { SortingFn } from './column/types'
export type { TableState as TableSnapshot }

/** Single sort entry: column id + direction. Order in the array = sort priority for multi-sort. */
export type SortingStateEntry = { id: string; desc: boolean }
/** Ordered list of sorts. Maps 1:1 to TanStack `state.sorting`. */
export type SortingState = SortingStateEntry[]

/**
 * Gesture that engages multi-column sort.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `event: 'ctrl'` is equally valid and needs no import.
 */
export const MultiSortEvent = {
	/** Shift+click adds the column. The default, and TanStack's. */
	Shift: 'shift',
	/** Ctrl+click (or ⌘+click on macOS) adds the column. */
	Ctrl: 'ctrl',
	/** Every click extends the multi-sort set — no modifier needed. */
	Always: 'always',
} as const

export type MultiSortEvent = (typeof MultiSortEvent)[keyof typeof MultiSortEvent]

export type MultiSortConfig = {
	/** Cap on simultaneously sorted columns. Unlimited by default. */
	max?: number
	/** Gesture that engages multi-sort. Default: {@link MultiSortEvent.Shift}. */
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
	/**
	 * Allow a third click to clear the sort. Default: true.
	 *
	 * Named `clearable`, not `removable`: {@link MultiSortConfig.removable} nested one level
	 * below means something else entirely — removing a *column* from the multi-sort set — and
	 * one word for two behaviours is how a config gets misread.
	 */
	clearable?: boolean
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
	/**
	 * Server-side column filtering: the grid stops filtering rows itself and hands
	 * the filter state to {@link FilteringConfig.onChange}.
	 *
	 * Shares one TanStack switch with {@link GlobalFilteringConfig.manual} — setting
	 * either one turns client-side filtering off for both axes.
	 */
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
 * The match functions available to global search by name.
 *
 * A closed set, and one the grid was previously passing through as a bare `string`: the value
 * is handed to TanStack, which resolves it against its own built-in filter functions, so a
 * typo — `'includesStrings'` — compiled, silently fell back to TanStack's `'auto'`, and
 * changed what the search box matched with no error anywhere.
 *
 * Named members for internal reference; the option is typed as {@link GlobalFilterFnId}, so
 * `fn: 'includesString'` is equally valid and needs no import. The same shape
 * `column.sorting.fn` uses for {@link BuiltInSortingFn}, and for the same reason.
 */
export const BuiltInGlobalFilterFn = {
	/** Case-insensitive substring match. The default. */
	IncludesString: 'includesString',
	/** Case-sensitive substring match. */
	IncludesStringSensitive: 'includesStringSensitive',
	/** Case-insensitive whole-value equality. */
	EqualsString: 'equalsString',
	/** Case-sensitive whole-value equality. */
	EqualsStringSensitive: 'equalsStringSensitive',
	/** The row value is an array containing the search value. */
	ArrIncludes: 'arrIncludes',
	/** The row value is an array containing all of the search values. */
	ArrIncludesAll: 'arrIncludesAll',
	/** The row value is an array containing some of the search values. */
	ArrIncludesSome: 'arrIncludesSome',
	/** Strict `===` against the raw row value. */
	Equals: 'equals',
	/** Loose `==` against the raw row value. */
	WeakEquals: 'weakEquals',
	/** Numeric range — the search value is a `[min, max]` tuple. */
	InNumberRange: 'inNumberRange',
} as const

export type BuiltInGlobalFilterFn = (typeof BuiltInGlobalFilterFn)[keyof typeof BuiltInGlobalFilterFn]

/**
 * A global-search match function by name: a built-in, or an id registered through
 * {@link GlobalFilteringConfig.fns}. The `string & {}` tail keeps a registry id assignable
 * while preserving autocomplete for the built-ins.
 */
export type GlobalFilterFnId = BuiltInGlobalFilterFn | (string & {})

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
	 * Server-side global search: the grid stops filtering rows itself and hands the
	 * search value to {@link GlobalFilteringConfig.onChange}, expecting the data it
	 * receives back to already be filtered.
	 *
	 * TanStack exposes a **single** `manualFiltering` switch covering both column
	 * filters and global search, so this option and {@link FilteringConfig.manual}
	 * feed the same flag: setting either one turns client-side filtering off for
	 * **both** axes. The two cannot be gated independently.
	 */
	manual?: boolean
	/**
	 * Function applied during global search.
	 * - {@link GlobalFilterFnId} — resolved against the {@link GlobalFilteringConfig.fns}
	 *   registry first, then as a {@link BuiltInGlobalFilterFn}.
	 * - {@link GlobalFilterFn} — used inline.
	 *
	 * Default: {@link BuiltInGlobalFilterFn.IncludesString} (case-insensitive substring).
	 */
	fn?: GlobalFilterFnId | GlobalFilterFn
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
 *
 * Named members for internal reference; the plain string union is what callers see, so
 * `direction === 'forward'` is equally valid and needs no import.
 */
export const LoadMoreDirection = {
	/** Load the next page (scroll down / append). Implemented. */
	Forward: 'forward',
	/**
	 * Load the previous page (scroll up / prepend). **Reserved for v2**: the member exists so
	 * the API can grow without a breaking change; v1 only ever emits
	 * {@link LoadMoreDirection.Forward} and performs no scroll-anchoring.
	 */
	Backward: 'backward',
} as const

export type LoadMoreDirection = (typeof LoadMoreDirection)[keyof typeof LoadMoreDirection]

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

/**
 * The server-total descriptor, as a genuine either/or.
 *
 * Both forms exist because both kinds of API exist: one returns how many rows match, the other
 * only how many pages there are. `rowCount` is the better one where it is available — TanStack
 * derives `pageCount` from it (`rowCount` ÷ `pageSize`, ceiling), `table.getRowCount()` returns
 * it, and the footer can say "1–10 of 137" instead of just "page 1 of 14".
 *
 * Supplying both is a contradiction waiting to drift apart, so the union forbids it rather than
 * leaving "not both" as a sentence in the docs.
 */
export type PaginationTotals = { rowCount?: number; pageCount?: never } | { pageCount?: number; rowCount?: never }

/**
 * What pagination *does* — not how it looks, hence `mode` rather than `variant`. How the
 * pagination bar *looks* is `PaginationVariant`, a separate option on the React adapter.
 *
 * "Footer" is deliberately not used for it anywhere in this API: that word belongs to the
 * `<tfoot>` summary row — `column.footer`, `column.footerClassName`, `align.footer`,
 * `<DataGrid.Footer />` — and one word for two rows is how a reader ends up in the wrong one.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `mode: 'infinite'` is equally valid and needs no import.
 */
export const PaginationMode = {
	/** Classic pagination bar over a paged row model. The default. */
	Pages: 'pages',
	/**
	 * Infinite scroll — mutually exclusive with the pagination bar. The grid is **event-only**:
	 * it calls {@link PaginationConfig.onLoadMore} at a load edge and the consumer appends rows.
	 */
	Infinite: 'infinite',
} as const

export type PaginationMode = (typeof PaginationMode)[keyof typeof PaginationMode]

export type PaginationConfig = FeatureToggle &
	PaginationTotals & {
		manual?: boolean
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
		 * Pagination mode. Default: {@link PaginationMode.Pages}. In
		 * {@link PaginationMode.Infinite} the grid is **event-only**: it calls
		 * {@link PaginationConfig.onLoadMore} when a load edge is reached, and the consumer
		 * appends rows via `table.appendData(rows)`.
		 */
		mode?: PaginationMode
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
		 * passes {@link LoadMoreDirection.Forward}.
		 *
		 * Prefer returning a promise so the loading indicator tracks the real request.
		 * A `void` return still flips `isFetchingNextPage` on, then off on the next
		 * microtask — so a synchronous handler shows a brief spinner flash.
		 */
		onLoadMore?: (ctx: { direction: LoadMoreDirection }) => Promise<void> | void
	}

export type SelectionConfig<TRow extends object = object> = FeatureToggle & {
	/**
	 * Called when row selection changes.
	 *
	 * The slice comes first, like every other feature's `onChange`, so a controlled grid can
	 * hand it straight back through `state.rowSelection`. The selected ids follow as a
	 * convenience — deriving them is the common case and `Object.keys(...).filter(...)` at every
	 * call site is noise.
	 */
	onChange?: (rowSelection: RowSelectionState, rowIds: string[]) => void
	/**
	 * Allow selecting more than one row. Default: true.
	 *
	 * Named `multi`, not `multiple`, to match {@link SortingConfig.multi} — "more than one of
	 * this feature at a time" is one concept and gets one word across the config.
	 *
	 * `false` drops `enableMultiRowSelection`, so selecting a row clears the previous one, and
	 * the React layer renders no select-all checkbox in the selection column's header — there
	 * is nothing for it to select.
	 */
	multi?: boolean
	/**
	 * Presentation of the auto-injected `__selection__` column — its width, which edge it
	 * pins to, its alignment. See {@link SystemColumnDef}.
	 */
	column?: SystemColumnDef<TRow>
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
 * Expanding config, generic over the type of {@link ExpandingConfig.component}.
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
	 * When omitted and `expanding.component` is provided, every row is expandable.
	 */
	getRowCanExpand?: (row: Row<TRow>) => boolean
	/**
	 * Sub-content mode: the detail-panel renderer.
	 *
	 * Defaults to `unknown` here — core is framework-agnostic and never calls it, it only
	 * carries it through to whichever adapter mounts the panel.
	 */
	component?: TRenderExpanded
	/** Called whenever the expanded set changes. Receives the resolved {@link ExpandedState}. */
	onChange?: (expanded: ExpandedState) => void
	/**
	 * Presentation of the auto-injected `__expand__` chevron column — its width, which edge it
	 * pins to, its alignment. See {@link SystemColumnDef}.
	 */
	column?: SystemColumnDef<TRow>
}

export type VisibilityConfig = FeatureToggle & {
	/**
	 * Called whenever column visibility changes. Receives the resolved {@link VisibilityState}.
	 * Use it to persist which columns a user hid.
	 */
	onChange?: (visibility: VisibilityState) => void
}

export type ColumnPinningConfig = FeatureToggle & {
	/** Called whenever column pinning changes. Receives the resolved {@link ColumnPinningState}. */
	onChange?: (columnPinning: ColumnPinningState) => void
}

export type RowPinningConfig = FeatureToggle & {
	top?: boolean
	bottom?: boolean
	/** Called whenever row pinning changes. Receives the resolved {@link RowPinningState}. */
	onChange?: (rowPinning: RowPinningState) => void
}

/**
 * Pinning groups two independent features over two separate state slices, so each carries its
 * own `onChange` rather than the group carrying one callback for both.
 */
export type PinningConfig = FeatureToggle & {
	/** Enable column pin UI (ColumnMenu in headers). */
	column?: boolean | ColumnPinningConfig
	/** Enable row pinning. `true` = top+bottom, or fine-grained RowPinningConfig. */
	row?: boolean | RowPinningConfig
}

export type RowVirtualizationConfig = FeatureToggle & {
	/** Estimated row height in px used by the virtualizer. Default: 50. */
	estimateSize?: number | ((index: number) => number)
	/** Extra rows rendered outside the visible viewport. Default: 5. */
	overscan?: number
}

export type VirtualizationConfig = FeatureToggle & {
	row?: boolean | RowVirtualizationConfig
	// column virtualization — reserved for future
}

/**
 * When a resize drag commits the new width.
 *
 * The two member values are `'onChange'` / `'onEnd'` — TanStack's `columnResizeMode` vocabulary,
 * kept verbatim **on purpose**, unlike `size`/`minSize`/`maxSize` (folded into `width`) or
 * `sortUndefined`'s `-1`/`1` (replaced by `'first'`/`'last'`). This is a **settled decision, not
 * an oversight**: these two names are what every TanStack Table user already knows this option
 * by, they read correctly on their own, and renaming them would buy a fresh vocabulary for a
 * setting nobody has to translate. That it sits beside the feature's own `onChange` callback is
 * noted and accepted — `mode` says which of the two you are reading.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `mode: 'onEnd'` is equally valid and needs no import.
 */
export const ColumnResizeMode = {
	/** The width follows the pointer live, every frame of the drag. The default. */
	OnChange: 'onChange',
	/** The width updates once, on mouse release. */
	OnEnd: 'onEnd',
} as const

export type ColumnResizeMode = (typeof ColumnResizeMode)[keyof typeof ColumnResizeMode]

/**
 * Text direction the grid is laid out in.
 *
 * A fact about the **whole grid**, so it lives once, at the root of {@link TableConfig}. It was
 * `resizing.direction`, which made a grid-wide property look like a resize setting: column
 * alignment already flips on its own (`align` is logical — `'start'` / `'end'` — and the
 * structural stylesheet emits `text-start` / `text-end`), so an RTL grid that never enabled
 * resizing had nowhere to say so, and one that did had to know that the resize drag was the
 * single thing not inferring it.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `direction: 'rtl'` is equally valid and needs no import.
 */
export const GridDirection = {
	/** Left-to-right. The default. */
	Ltr: 'ltr',
	/** Right-to-left. */
	Rtl: 'rtl',
} as const

export type GridDirection = (typeof GridDirection)[keyof typeof GridDirection]

export type ResizingConfig = FeatureToggle & {
	/** Resize mode. Default: {@link ColumnResizeMode.OnChange}. */
	mode?: ColumnResizeMode
	/**
	 * Called whenever a column's width changes. Receives the resolved {@link ColumnSizingState}.
	 * Fires on the committed sizes, not on the transient drag info.
	 */
	onChange?: (columnSizing: ColumnSizingState) => void
}

/**
 * Seedable subset of {@link TableState} for {@link TableConfig.initialState}.
 *
 * Excludes the three write features' slices — `editing`, `creating` and `deleting` — these are
 * transient per-open-form/dialog state that each feature re-initialises whenever it opens
 * (`creating.start()`, an edit start, a delete request), hard-resetting to its own defaults and
 * ignoring whatever was seeded. Seeding "start already editing/creating/deleting" is not a
 * meaningful thing to express, so it's forbidden at the type level rather than silently ignored
 * at runtime. To seed values for a create form, use {@link CreatingConfig.defaultValues} (table
 * level) or a column's `creating.defaultValue` (per-column), not `initialState`.
 */
export type InitialTableState = Omit<Partial<TableState>, 'editing' | 'creating' | 'deleting' | 'pagination'> & {
	/**
	 * Seeded per key, unlike every other slice. `Partial<TableState>` only makes the slice
	 * itself optional — TanStack's `PaginationState` still requires **both** `pageIndex` and
	 * `pageSize`, so a deep link that only wants to open on page 3 had to restate a `pageSize`
	 * it has no opinion about, and restating it wrong silently overrode
	 * {@link PaginationConfig.pageSize}.
	 *
	 * Whichever key is omitted keeps its resolved default: `pageIndex: 0`, and `pageSize` from
	 * {@link PaginationConfig.pageSize}.
	 *
	 * `pageSize` is therefore settable from two places, and that is deliberate:
	 * {@link PaginationConfig.pageSize} is where an author *states* the size, this is where a
	 * deep link *restores* the one the user picked. Write both and the seed wins — `createTable`
	 * warns in development rather than leaving it to be noticed by a page that opens on a size
	 * nobody asked for.
	 */
	pagination?: Partial<PaginationState>
}

export type TableConfig<TRow extends object> = {
	data: TRow[]
	/**
	 * Columns, from `createColumns` / `createColumnHelper` or written inline.
	 *
	 * The cell-type parameter is deliberately widened to `string` here rather than threaded
	 * through `TableConfig`: a second type parameter on this type destroys `TRow` inference
	 * at every `useDataGrid({ data, columns })` call site, which is far more costly than what
	 * it would buy. Nothing is lost — a custom `cell: { type: … }` is checked against the
	 * kit's registry by the **bound** `createColumns` / `createColumnHelper` that produced the
	 * array, which is where the author writes it. This slot only has to accept the result.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	columns: ColumnDef<TRow, any, unknown>[]

	/**
	 * Returns a stable string ID for a row.
	 * Defaults to `row.id` when present, otherwise falls back to the array index.
	 */
	getRowId?: (row: TRow, index: number) => string

	/**
	 * Text direction the grid is laid out in. Default: {@link GridDirection.Ltr}.
	 *
	 * A grid-wide fact, declared once. Column alignment is logical and flips on its own; this is
	 * what the behaviours that cannot infer it read — today, the direction a resize drag widens a
	 * column in. It was `resizing.direction`, where a grid with resizing off could not state it
	 * at all.
	 */
	direction?: GridDirection

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
	selection?: boolean | SelectionConfig<TRow>
	expanding?: boolean | ExpandingConfig<TRow>
	/**
	 * Column visibility (hide/show columns). `false` / omitted disables hiding for all
	 * columns; `true` enables it (per-column `visibility` controls still apply).
	 *
	 * The UI config (e.g. the toolbar button) is a React concern and lives on the adapter's
	 * `ReactVisibilityConfig`, which extends this one.
	 */
	visibility?: boolean | VisibilityConfig
	/**
	 * Pinning configuration. Column pinning and row pinning are gated independently:
	 * - `true` — enable column menu UI + row pin top+bottom
	 * - `{ column: true }` — column menu only
	 * - `{ row: { top: true } }` — row pin top only
	 * - `false` / omitted — no pinning at all
	 */
	pinning?: boolean | PinningConfig
	virtualization?: boolean | VirtualizationConfig
	/**
	 * Row creation. `false` / omitted disables it; an object enables it **and** supplies the
	 * `onSave` without which there is nothing to enable.
	 *
	 * `true` is accepted for one reason: a defaults layer
	 * ({@link https://ez-kit.dev/docs/data-grid/default-options DataGridOptionsProvider} or
	 * `createDataGrid({ defaults })`) can describe how creation *looks* for the whole app —
	 * `mode`, `validateOn` — while only the grid that supplies `onSave` gets the feature.
	 * `creating: true` at such a call site says "yes, this grid too", and the merge keeps the
	 * shared object. Without a resolved `onSave` the feature stays off rather than mounting a
	 * trigger whose commit would call `undefined`.
	 */
	creating?: boolean | CreatingConfig<TRow>
	/** Row editing. Same three-way shape as {@link TableConfig.creating}. */
	editing?: boolean | EditingConfig<TRow>
	/** Row deletion. Same three-way shape as {@link TableConfig.creating}, keyed on `onDelete`. */
	deleting?: boolean | DeletingConfig<TRow>
	/**
	 * Defer application of sorting, column filters and global search. While on,
	 * those three axes accumulate as a draft and reach `onStateChange` only when
	 * `table.draft.apply()` runs — one state change, one request, instead of one
	 * per keystroke. Requires `manual: true` on at least one of the three.
	 *
	 * Named for the thing it produces, like every other feature: the API it turns on is
	 * `table.draft`, the state it seeds is `initialState.draft`, the bar that reports it is
	 * `<DataGrid.DraftBar />`, and the axes are `DraftAxis`. It was `deferredApply`,
	 * which left one feature answering to two words depending on where you touched it.
	 *
	 * The object form exists for the same reason every other feature has one — `enabled: false`
	 * turns off a `draft` that arrived from a defaults layer.
	 */
	draft?: boolean | DraftConfig
	/**
	 * The per-row actions column (`__actions__`), which holds edit, delete and the row-pin
	 * menu — how those are presented, and any application actions of your own.
	 *
	 * The column is injected automatically as soon as any of {@link TableConfig.editing},
	 * {@link TableConfig.deleting}, row pinning or `rowActions.actions` is in play.
	 *
	 * Generic over `TRow` so `actions` receives a typed row. Without the argument the callback
	 * would see `Row<object>` and every consumer would have to cast `row.original` back —
	 * which is the same reason {@link TableConfig.deleting} and the rest are generic.
	 *
	 * `false` suppresses the column outright, including the built-in edit / delete / pin
	 * affordances — the read-only escape hatch for a single grid under a defaults layer that
	 * configured row actions app-wide. Like every other feature switch on this config, and
	 * unlike the object-only shape this had, which left such a grid no way to opt out at all.
	 */
	rowActions?: boolean | RowActionsConfig<TRow>
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
	 * Cannot seed `editing`, `creating` or `deleting` — see
	 * {@link InitialTableState} for why. To seed create-form values use
	 * {@link TableConfig.creating}'s `defaultValues`, or a column's `creating.defaultValue`.
	 */
	initialState?: InitialTableState
	/**
	 * Called whenever the table state changes (sorting, filtering, pagination, etc.).
	 * Receives the **resolved** next state — assign it to your own state to implement
	 * controlled mode.
	 *
	 * Under {@link TableConfig.draft} this fires only when the query the consumer
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
	/**
	 * The snapshot as of construction, frozen.
	 *
	 * Sibling of {@link DataTable.getSnapshot}, and framework-neutral despite its one known
	 * caller: React's `useSyncExternalStore` needs a server snapshot that never moves, and
	 * "the state this table started with" is a fact about the table, not about React.
	 */
	getInitialSnapshot: () => TableState
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

/* eslint-disable @typescript-eslint/no-unnecessary-type-arguments */
import type { ColumnDef, SortingFn } from './column/types'
import type { CreatingConfig } from './features/creating'
import type { DeletingConfig } from './features/deleting'
import type { EditingConfig } from './features/editing'
import type { FilterOperatorDef } from './features/operators'
import type {
	Column,
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
 * @example Multi-sort with toolbar builder, capped at 3 columns, ctrl-click
 * ```ts
 * createTable({
 *   data, columns,
 *   sorting: { multi: { max: 3, event: 'ctrl' }, toolbar: true },
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
export type SortingConfig = {
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
	/**
	 * Initial multi-column sort. Order in the array = sort priority.
	 *
	 * @example Single-column default sort
	 * ```ts
	 * sorting: { initial: [{ id: 'createdAt', desc: true }] }
	 * ```
	 *
	 * @example Multi-column default — sort by status asc, then by updatedAt desc
	 * ```ts
	 * createTable({
	 *   data, columns,
	 *   sorting: {
	 *     initial: [
	 *       { id: 'status', desc: false },
	 *       { id: 'updatedAt', desc: true },
	 *     ],
	 *     multi: true,
	 *   },
	 * })
	 * ```
	 */
	initial?: SortingState
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
	/** Show a multi-sort builder button in the toolbar. Default: false. UI-only flag, ignored by core. */
	toolbar?: boolean
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

export type FilteringConfig = {
	manual?: boolean
	/** Enable global (cross-column) filter. Default: true when filtering is enabled. */
	global?: boolean
	/** Table-level custom operators (or built-in overrides). Referenced by column items by ID. */
	operators?: FilterOperatorDef[]
}

export type PaginationConfig = {
	manual?: boolean
	pageCount?: number
	pageSize?: number
}

export type SelectionConfig = {
	/** Called when row selection changes. */
	onChange?: (rowIds: string[]) => void
	/** Allow selecting multiple rows. Default: true. */
	multiple?: boolean
}

export type ExpandingVariant = 'sub-content' | 'tree'

export type ExpandingConfig = {
	/** Mode switch. Default: 'sub-content'. */
	variant?: ExpandingVariant
	/** Tree mode: sub-row extractor. Auto-detects row.children when omitted. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getSubRows?: (row: any, index: number) => any[] | undefined
	/** Sub-content mode: per-row expandability callback. Provided by React layer. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getRowCanExpand?: (row: any) => boolean
	/** Sub-content mode: React component for detail panel. Provided by React layer. */
	renderExpanded?: unknown
}

export type RowPinningConfig = {
	top?: boolean
	bottom?: boolean
}

export type PinningConfig = {
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

export type VirtualizedConfig = {
	row?: boolean | RowVirtualOptions
	// column virtualization — reserved for future
}

export type ColumnResizeMode = 'onChange' | 'onEnd'
export type ColumnResizeDirection = 'ltr' | 'rtl'

export type SizingConfig = {
	/** Resize mode. 'onChange' updates live; 'onEnd' updates after mouse release. Default: 'onChange'. */
	mode?: ColumnResizeMode
	/** Text direction for resize calculation. Default: 'ltr'. */
	direction?: ColumnResizeDirection
}

export type TableConfig<TRow extends object> = {
	data: TRow[]
	columns: ColumnDef<TRow>[]

	/**
	 * Returns a stable string ID for a row.
	 * Defaults to `row.id` when present, otherwise falls back to the array index.
	 */
	getRowId?: (row: TRow, index: number) => string

	sorting?: boolean | SortingConfig
	filtering?: boolean | FilteringConfig
	pagination?: boolean | PaginationConfig
	selection?: boolean | SelectionConfig
	expanding?: boolean | ExpandingConfig
	/**
	 * Pinning configuration.
	 * - `true` — enable column menu UI + row pin top+bottom
	 * - `{ column: true }` — column menu only
	 * - `{ row: { top: true } }` — row pin top only
	 * - `false` / omitted — no pinning
	 */
	pinning?: boolean | PinningConfig
	virtualized?: boolean | VirtualizedConfig
	creating?: CreatingConfig<TRow>
	editing?: EditingConfig<TRow>
	deleting?: DeletingConfig<TRow>
	loading?: boolean
	sizing?: boolean | SizingConfig
	/**
	 * Called whenever the table state changes (sorting, filtering, pagination, etc.).
	 * Receives the raw TanStack updater — apply it to your own state to implement controlled mode.
	 * @example
	 * const [tableState, setTableState] = useState<Partial<TableState>>({})
	 * useDataGrid({ ..., state: tableState, onStateChange: (updater) => setTableState(prev => typeof updater === 'function' ? updater(prev as TableState) : updater) })
	 */
	onStateChange?: (updater: Updater<TableState>) => void
}

/**
 * Extended TanStack table instance returned by createTable().
 * Adds subscribe/getSnapshot for useSyncExternalStore and setData/setLoading.
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
}

/** Public alias. */
export type Table<TRow extends object> = DataTable<TRow>

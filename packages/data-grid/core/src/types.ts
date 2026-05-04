/* eslint-disable @typescript-eslint/no-unnecessary-type-arguments */
import type { ColumnDef } from './column/types'
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

export type { TableState as TableSnapshot }

export type SortingConfig = {
	manual?: boolean
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

export type ExpandingConfig = {
	/** React component / render fn for sub-row (provided by React layer). */
	renderSubRow?: unknown
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

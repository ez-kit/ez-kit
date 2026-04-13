import type { ColumnDef } from './column/types'
import type { CreatingConfig } from './features/creating'
import type { DeletingConfig } from './features/deleting'
import type { EditingConfig } from './features/editing'
import type { Table as TanStackTable, TableState } from '@tanstack/table-core'

export type { TableState as TableSnapshot }

export interface SortingConfig {
  manual?: boolean
}

export interface FilteringConfig {
  manual?: boolean
  /** Enable global (cross-column) filter. Default: true when filtering is enabled. */
  global?: boolean
}

export interface PaginationConfig {
  manual?: boolean
  pageCount?: number
  pageSize?: number
}

export interface SelectionConfig {
  /** Called when row selection changes. */
  onChange?: (rowIds: string[]) => void
  /** Allow selecting multiple rows. Default: true. */
  multiple?: boolean
}

export interface ExpandingConfig {
  /** React component / render fn for sub-row (provided by React layer). */
  renderSubRow?: unknown
}

export interface PinConfig {
  rows?: boolean
}

export interface VirtualConfig {
  rowHeight?: number
}

export interface TableConfig<TRow extends object> {
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
  pin?: boolean | PinConfig
  virtualizing?: boolean | VirtualConfig
  creating?: CreatingConfig<TRow>
  editing?: EditingConfig<TRow>
  deleting?: DeletingConfig<TRow>
  loading?: boolean
}

/**
 * Extended TanStack table instance returned by createTable().
 * Adds subscribe/getSnapshot for useSyncExternalStore and setData/setLoading.
 */
export interface DataTable<TRow extends object> extends TanStackTable<TRow> {
  /** Subscribe to all state changes. Returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void
  /** Returns a stable snapshot of current state for useSyncExternalStore. */
  getSnapshot: () => TableState
  /** Reactively replace the data array. */
  setData: (data: TRow[]) => void
}

/** Public alias. */
export type Table<TRow extends object> = DataTable<TRow>

import { createTable } from '@ez-kit/data-grid-core'
import { useEffect, useRef, useSyncExternalStore } from 'react'

import type { CellTypeRegistry } from './cell-types-context'
import type { DataTable, FilteringConfig, RowVirtualOptions, TableConfig, VirtualizedConfig } from '@ez-kit/data-grid-core'
import type { Row, Table } from '@tanstack/table-core'
import type { ReactElement } from 'react'

/** Symbol used to carry cellTypes on the table instance for DataGrid to read. */
export const CELL_TYPES_KEY = Symbol('cellTypes')

/** Symbol used to carry pageSizer config on the table instance for PageSizer to read. */
export const PAGE_SIZER_KEY = Symbol('pageSizer')

/** Symbol used to carry rowPinning config on the table instance for RowPinCell to read. */
export const ROW_PINNING_KEY = Symbol('rowPinning')

/** Symbol used to carry colPinning enabled flag on the table instance for Header to read. */
export const COL_PINNING_KEY = Symbol('colPinning')

/** Symbol used to carry normalized virtualized config on the table instance for Body/Table to read. */
export const VIRTUALIZED_KEY = Symbol('virtualized')

/** Symbol used to carry selectionBar config on the table instance for SelectionBar to read. */
export const SELECTION_BAR_KEY = Symbol('selectionBar')

/** Symbol used to carry columnVisibility UI config on the table instance for Toolbar to read. */
export const COLUMN_VISIBILITY_KEY = Symbol('columnVisibility')

/** Symbol used to carry filtering variant on the table instance for Header to read. */
export const FILTERING_VARIANT_KEY = Symbol('filteringVariant')

export interface SelectionBarCallbackArgs<TRow extends object = object> {
  table: Table<TRow>
  clearSelection: () => void
  selectedRows: Row<TRow>[]
}

export interface SelectionBarConfig<TRow extends object = object> {
  /** If provided — Delete button appears in the bar. */
  onDelete?: (args: SelectionBarCallbackArgs<TRow>) => void
  /**
   * Replaces default clear behaviour.
   * `clearSelection` arg is the default reset — call it if needed.
   */
  onClear?: (args: SelectionBarCallbackArgs<TRow>) => void
  /** Rendered between Delete and Cancel. ReactElement or render-function. */
  actions?: ReactElement | ((args: SelectionBarCallbackArgs<TRow>) => ReactElement)
}

/** Normalized virtualized config stored on the table instance. */
export interface NormalizedVirtualizedConfig {
  row: RowVirtualOptions
}

function normalizeVirtualized(
  virtualized: boolean | VirtualizedConfig | undefined,
): NormalizedVirtualizedConfig | undefined {
  if (!virtualized) return undefined
  if (virtualized === true) return { row: {} }
  const row = virtualized.row
  if (!row) return undefined
  if (row === true) return { row: {} }
  return { row }
}

export interface PageSizerConfig {
  items: number[]
}

export interface ColumnVisibilityUIConfig {
  /** Show a column visibility toggle button in the toolbar. Default: false. */
  toolbar?: boolean
}

export type FilteringVariant = 'inline' | 'popover'

export interface ReactFilteringConfig extends FilteringConfig {
  /** Display variant for column filter controls. Default: 'inline'. */
  variant?: FilteringVariant
}

export interface UseDataGridConfig<TRow extends object> extends Omit<TableConfig<TRow>, 'filtering'> {
  /**
   * Enable filtering.
   * - `true` — inline filter inputs below each column header
   * - `{ variant: 'popover' }` — filter icon in header; click opens a popover with the filter input
   * - `{ variant: 'inline', ...opts }` — same as `true` with extra FilteringConfig options
   */
  filtering?: boolean | ReactFilteringConfig
  /** Custom cell type renderers. Merged with types passed directly to `DataGrid`. */
  cellTypes?: CellTypeRegistry
  /** Page size selector config. When provided, renders a PageSizer control. */
  pageSizer?: PageSizerConfig
  /**
   * Selection info bar config.
   * - `false` — bar never shown
   * - `undefined` | `true` — bar shown when ≥1 row selected (no delete button)
   * - `SelectionBarConfig` — bar shown with config
   *
   * Requires `selection: true` to have any effect.
   */
  selectionBar?: boolean | SelectionBarConfig<TRow>
  /**
   * Column visibility UI config.
   * - `true` — enables column visibility (toolbar button shown)
   * - `{ toolbar: true }` — shows toggle button in toolbar
   */
  columnVisibility?: boolean | ColumnVisibilityUIConfig
}

/**
 * React hook that creates a data-grid instance and subscribes to its state.
 * The instance is created once and survives re-renders.
 * `config.data` and `config.loading` are synced on every render.
 *
 * @example
 * const table = useDataGrid({ data: users, columns, sorting: true })
 */
export function useDataGrid<TRow extends object>(
  config: UseDataGridConfig<TRow>,
): DataTable<TRow> {
  const { cellTypes, pageSizer, selectionBar, columnVisibility, filtering: rawFiltering, ...restConfig } = config

  const filteringVariant: FilteringVariant | undefined =
    typeof rawFiltering === 'object' && rawFiltering !== null
      ? rawFiltering.variant
      : undefined

  const coreFiltering: boolean | FilteringConfig | undefined =
    typeof rawFiltering === 'object' && rawFiltering !== null
      ? (({ variant: _, ...rest }) => rest)(rawFiltering)
      : rawFiltering

  const tableRef = useRef<DataTable<TRow> | null>(null)
  tableRef.current ??= createTable({ ...restConfig, filtering: coreFiltering } as TableConfig<TRow>)

  // Store cellTypes on the table instance so DataGrid can read without an extra prop
  const cellTypesRef = useRef(cellTypes)
  cellTypesRef.current = cellTypes
  ;(tableRef.current as unknown as Record<symbol, unknown>)[CELL_TYPES_KEY] = cellTypesRef.current

  // Store pageSizer config on the table instance so PageSizer can read without an extra prop
  const pageSizerRef = useRef(pageSizer)
  pageSizerRef.current = pageSizer
  ;(tableRef.current as unknown as Record<symbol, unknown>)[PAGE_SIZER_KEY] = pageSizerRef.current

  // Store rowPinning config on the table instance so RowPinCell can read without an extra prop
  const rowPinningRef = useRef(config.pinning)
  rowPinningRef.current = config.pinning
  ;(tableRef.current as unknown as Record<symbol, unknown>)[ROW_PINNING_KEY] = rowPinningRef.current

  // Store colPinning enabled flag on the table instance so Header can read without an extra prop
  const colPinEnabled =
    config.pinning === true ||
    (typeof config.pinning === 'object' && Boolean(config.pinning.column))
  ;(tableRef.current as unknown as Record<symbol, unknown>)[COL_PINNING_KEY] = colPinEnabled

  // Store selectionBar config on the table instance so SelectionBar can read without an extra prop
  const selectionBarRef = useRef(selectionBar)
  selectionBarRef.current = selectionBar
  ;(tableRef.current as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY] =
    selectionBarRef.current

  // Store columnVisibility UI config on the table instance so Toolbar can read without an extra prop
  const colVisibilityRef = useRef(columnVisibility)
  colVisibilityRef.current = columnVisibility
  ;(tableRef.current as unknown as Record<symbol, unknown>)[COLUMN_VISIBILITY_KEY] =
    colVisibilityRef.current

  // Store filteringVariant on the table instance so Header can read without an extra prop
  ;(tableRef.current as unknown as Record<symbol, unknown>)[FILTERING_VARIANT_KEY] = filteringVariant

  // Store normalized virtualized config on the table instance so DataGridTable/Body can read without an extra prop
  const virtualizedConfig = normalizeVirtualized(config.virtualized)
  ;(tableRef.current as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY] = virtualizedConfig

  // Subscribe so React re-renders on any table state change
  useSyncExternalStore(
    tableRef.current.subscribe,
    tableRef.current.getSnapshot,
    tableRef.current.getSnapshot,
  )

  // Sync data on change (every render, skipping if same reference)
  const dataRef = useRef(config.data)
  useEffect(() => {
    if (config.data !== dataRef.current) {
      dataRef.current = config.data
      tableRef.current?.setData(config.data)
    }
  })

  // Sync loading on change
  useEffect(() => {
    if (config.loading !== undefined) {
      tableRef.current?.setLoading(config.loading)
    }
  }, [config.loading])

  return tableRef.current
}

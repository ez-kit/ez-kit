import { createTable } from '@ez-kit/data-grid-core'
import { useEffect, useRef, useSyncExternalStore } from 'react'

import type { CellTypeRegistry } from './cell-types-context'
import type { DataTable, TableConfig } from '@ez-kit/data-grid-core'

/** Symbol used to carry cellTypes on the table instance for DataGrid to read. */
export const CELL_TYPES_KEY = Symbol('cellTypes')

/** Symbol used to carry pageSizer config on the table instance for PageSizer to read. */
export const PAGE_SIZER_KEY = Symbol('pageSizer')

/** Symbol used to carry rowPinning config on the table instance for RowPinCell to read. */
export const ROW_PINNING_KEY = Symbol('rowPinning')

/** Symbol used to carry colPinning enabled flag on the table instance for Header to read. */
export const COL_PINNING_KEY = Symbol('colPinning')

export interface PageSizerConfig {
  items: number[]
}

export interface UseDataGridConfig<TRow extends object> extends TableConfig<TRow> {
  /** Custom cell type renderers. Merged with types passed directly to `DataGrid`. */
  cellTypes?: CellTypeRegistry
  /** Page size selector config. When provided, renders a PageSizer control. */
  pageSizer?: PageSizerConfig
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
  const { cellTypes, pageSizer, ...tableConfig } = config

  const tableRef = useRef<DataTable<TRow> | null>(null)
  tableRef.current ??= createTable(tableConfig as TableConfig<TRow>)

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

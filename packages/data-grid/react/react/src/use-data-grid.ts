import { createTable } from '@ez-kit/data-grid-core'
import { useEffect, useRef, useSyncExternalStore } from 'react'

import type { CellTypeRegistry } from './cell-types-context'
import type { DataTable, TableConfig } from '@ez-kit/data-grid-core'

/** Symbol used to carry cellTypes on the table instance for DataGrid to read. */
export const CELL_TYPES_KEY = Symbol('cellTypes')

export interface UseDataGridConfig<TRow extends object> extends TableConfig<TRow> {
  /** Custom cell type renderers. Merged with types passed directly to `DataGrid`. */
  cellTypes?: CellTypeRegistry
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
  const { cellTypes, ...tableConfig } = config

  const tableRef = useRef<DataTable<TRow> | null>(null)
  tableRef.current ??= createTable(tableConfig as TableConfig<TRow>)

  // Store cellTypes on the table instance so DataGrid can read without an extra prop
  const cellTypesRef = useRef(cellTypes)
  cellTypesRef.current = cellTypes
  ;(tableRef.current as unknown as Record<symbol, unknown>)[CELL_TYPES_KEY] = cellTypesRef.current

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

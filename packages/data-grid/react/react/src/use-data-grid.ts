import { createTable } from '@ez-kit/data-grid-core'
import { useEffect, useRef, useSyncExternalStore } from 'react'

import type { DataTable, TableConfig } from '@ez-kit/data-grid-core'


/**
 * React hook that creates a data-grid instance and subscribes to its state.
 * The instance is created once and survives re-renders.
 * `config.data` and `config.loading` are synced on every render.
 *
 * @example
 * const table = useDataGrid({ data: users, columns, sorting: true })
 */
export function useDataGrid<TRow extends object>(
  config: TableConfig<TRow>,
): DataTable<TRow> {
  const tableRef = useRef<DataTable<TRow> | null>(null)
  tableRef.current ??= createTable(config)

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

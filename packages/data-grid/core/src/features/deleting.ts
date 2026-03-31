import type { RowData, Row, TableFeature } from '@tanstack/table-core'

export interface DeletingConfig<TData> {
  onDelete: (row: Row<TData>) => void | Promise<void>
}

declare module '@tanstack/table-core' {
   
  interface TableOptionsResolved<TData extends RowData> {
    deleting?: DeletingConfig<TData>
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Table<TData extends RowData> {
    deleteRow: (rowId: string) => Promise<void>
  }
}

export const DeletingFeature: TableFeature = {
  createTable: (table) => {
    table.deleteRow = async (rowId) => {
      const config = table.options.deleting
      if (!config) return
      const row = table.getRowModel().rows.find((r) => r.id === rowId) as
        | Row<RowData>
        | undefined
      if (!row) return
      await config.onDelete(row as Row<(typeof table)['options']['data'][number]>)
    }
  },
}


import { GridComponentsProvider } from '../components-context'


import { Body } from './body'
import { DataGridCell } from './cell'
import { CreateTrigger } from './create-trigger'
import { CreatingModal } from './creating-modal'
import { EditingModal } from './editing-modal'
import { Header } from './header'
import { Pagination } from './pagination'
import { DataGridRow } from './row'
import { DataGridTable } from './table'
import { TableContext } from './table-context'
import { Toolbar } from './toolbar'

import type { GridComponents } from '../types'
import type { DataTable } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

export interface DataGridProps<TRow extends object> {
  table: DataTable<TRow>
  /** Local component overrides — merged with global GridComponentsProvider. */
  components?: GridComponents
  children?: ReactNode
}

function DefaultLayout() {
  return (
    <>
      <Toolbar />
      <DataGridTable />
      <Pagination />
    </>
  )
}

/**
 * Root compound component for the data grid.
 *
 * @example — default layout
 * <DataGrid table={table} />
 *
 * @example — custom layout via compound pattern
 * <DataGrid table={table}>
 *   <DataGrid.Toolbar />
 *   <DataGrid.Table />
 *   <DataGrid.Pagination />
 * </DataGrid>
 */
function DataGridRoot<TRow extends object>({
  table,
  components,
  children,
}: DataGridProps<TRow>) {
  return (
    <GridComponentsProvider {...(components !== undefined ? { components } : {})}>
      <TableContext value={table}>
        {children ?? <DefaultLayout />}
        {table.options.creating?.mode === 'modal' && <CreatingModal />}
        {table.options.editing?.mode === 'modal' && <EditingModal />}
      </TableContext>
    </GridComponentsProvider>
  )
}

// ── Attach sub-components as static properties ────────────────────────────

type DataGridType = typeof DataGridRoot & {
  Toolbar: typeof Toolbar
  Table: typeof DataGridTable
  Header: typeof Header
  Body: typeof Body
  Row: typeof DataGridRow
  Cell: typeof DataGridCell
  Pagination: typeof Pagination
  CreateTrigger: typeof CreateTrigger
  CreatingModal: typeof CreatingModal
  EditingModal: typeof EditingModal
}

export const DataGrid = DataGridRoot as DataGridType
DataGrid.Toolbar = Toolbar
DataGrid.Table = DataGridTable
DataGrid.Header = Header
DataGrid.Body = Body
DataGrid.Row = DataGridRow
DataGrid.Cell = DataGridCell
DataGrid.Pagination = Pagination
DataGrid.CreateTrigger = CreateTrigger
DataGrid.CreatingModal = CreatingModal
DataGrid.EditingModal = EditingModal

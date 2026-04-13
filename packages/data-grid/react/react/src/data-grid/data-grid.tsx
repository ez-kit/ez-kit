import { CellTypesProvider } from '../cell-types-context'
import { GridComponentsProvider } from '../components-context'
import { CELL_TYPES_KEY } from '../use-data-grid'

import { Body } from './body'
import { DataGridCell } from './cell'
import { CreateTrigger } from './create-trigger'
import { CreatingModal } from './creating-modal'
import { EditingModal } from './editing-modal'
import { Header } from './header'
import { Pagination } from './pagination'
import { PageSizer } from './page-sizer'
import { DataGridRow } from './row'
import { DataGridTable } from './table'
import { TableContext } from './table-context'
import { Toolbar } from './toolbar'

import type { CellTypeRegistry } from '../cell-types-context'
import type { GridComponents } from '../types'
import type { DataTable } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

export interface DataGridProps<TRow extends object> {
	table: DataTable<TRow>
	/** Local component overrides — merged with global GridComponentsProvider. */
	components?: GridComponents
	/** Custom cell type renderers. Merged with types from `useDataGrid`. */
	cellTypes?: CellTypeRegistry
	children?: ReactNode
}

function DefaultLayout() {
	return (
		<>
			<Toolbar />
			<DataGridTable />
			<Pagination />
			<PageSizer />
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
function DataGridRoot<TRow extends object>({ table, components, cellTypes, children }: DataGridProps<TRow>) {
	// Read cellTypes stored on the table instance by useDataGrid, merge with direct prop
	const tableCellTypes = (table as unknown as Record<symbol, unknown>)[CELL_TYPES_KEY] as CellTypeRegistry | undefined
	const resolvedCellTypes = { ...tableCellTypes, ...cellTypes }

	return (
		<CellTypesProvider types={resolvedCellTypes}>
			<GridComponentsProvider {...(components !== undefined ? { components } : {})}>
				<TableContext value={table}>
					{children ?? <DefaultLayout />}
					{table.options.creating?.mode === 'modal' && <CreatingModal />}
					{table.options.editing?.mode === 'modal' && <EditingModal />}
				</TableContext>
			</GridComponentsProvider>
		</CellTypesProvider>
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
	PageSizer: typeof PageSizer
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
DataGrid.PageSizer = PageSizer
DataGrid.CreateTrigger = CreateTrigger
DataGrid.CreatingModal = CreatingModal
DataGrid.EditingModal = EditingModal

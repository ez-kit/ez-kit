import { CellTypesProvider } from '../cell-types-context'
import { GridComponentsProvider, useGridComponents } from '../components-context'
import {
	CELL_TYPES_KEY,
	FILTER_CHIPS_KEY,
	SELECTION_BAR_KEY,
	type NormalizedFilterChipsConfig,
	type SelectionBarConfig,
} from '../use-data-grid'

import { ActiveFiltersBar } from './active-filters-bar'
import { Body } from './body'
import { DataGridCell } from './cell'
import { ClearFiltersButton } from './clear-filters-button'
import { ColumnVisibilityTrigger } from './column-visibility-trigger'
import { CreateTrigger } from './create-trigger'
import { CreatingModal } from './creating-modal'
import { EditingModal } from './editing-modal'
import { EmptyStateRow } from './empty-state-row'
import { FilterPanel } from './filter-panel'
import { GlobalFilterInput } from './global-filter-input'
import { Header } from './header'
import { LoadingBody } from './loading-body'
import { NoResultsRow } from './no-results-row'
import { PageSizer } from './page-sizer'
import { Pagination } from './pagination'
import { DataGridRow } from './row'
import { SelectionBar } from './selection-bar'
import { SortTrigger } from './sort-trigger'
import { DataGridTable } from './table'
import { TableContext, useTable } from './table-context'
import { Toolbar } from './toolbar'

import type { CellTypeRegistry } from '../cell-types-context'
import type { DataGridInstance } from '../data-grid-instance'
import type { GridComponents } from '../types'
import type { ConfirmationOptions } from '@ez-kit/data-grid-core'
import type { Row } from '@tanstack/table-core'
import type { ReactNode } from 'react'

export type DataGridProps<TRow extends object> = {
	/** Instance returned by `useDataGrid`. */
	table: DataGridInstance<TRow>
	/** Local component overrides — merged with global GridComponentsProvider. */
	components?: GridComponents
	/** Custom cell type renderers. Merged with types from `useDataGrid`. */
	cellTypes?: CellTypeRegistry
	children?: ReactNode
}

function resolveConfirmationText(
	options: ConfirmationOptions,
	row: Row<unknown> | undefined,
): { title: string; description: string } {
	const title = options.title ?? 'Are you sure?'
	const desc = options.description
	let description: string
	if (typeof desc === 'function') {
		description = row ? desc(row) : 'This action cannot be undone.'
	} else {
		description = desc ?? 'This action cannot be undone.'
	}
	return { title, description }
}

function ConfirmDialogRenderer() {
	const table = useTable()
	const { ConfirmDialog } = useGridComponents()
	const pendingId = table.getState().pendingDeleteRowId
	const confirmation = table.options.deleting?.confirmation

	if (!confirmation) return null

	const options: ConfirmationOptions = confirmation === true ? {} : confirmation
	const pendingRow = pendingId !== null ? table.getRowModel().rows.find((r) => r.id === pendingId) : undefined
	const { title, description } =
		pendingId !== null ? resolveConfirmationText(options, pendingRow) : { title: '', description: '' }

	return (
		<ConfirmDialog
			open={pendingId !== null}
			title={title}
			description={description}
			onConfirm={() => void table.confirmDeleteRow()}
			onCancel={() => {
				table.cancelDeleteRow()
			}}
		/>
	)
}

function DefaultLayout() {
	const table = useTable()
	const rawConfig = (table as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY] as
		| boolean
		| SelectionBarConfig
		| undefined
	const variant = (typeof rawConfig === 'object' ? rawConfig.variant : undefined) ?? 'floating'

	const chipsConfig = (table as unknown as Record<symbol, unknown>)[FILTER_CHIPS_KEY] as
		| NormalizedFilterChipsConfig
		| undefined
	const chipsAbove = chipsConfig?.position === 'above' ? <ActiveFiltersBar /> : null
	const chipsBelow = chipsConfig?.position === 'below' ? <ActiveFiltersBar /> : null

	if (variant === 'inline') {
		return (
			<>
				<SelectionBar />
				<Toolbar />
				{chipsAbove}
				<DataGridTable />
				{chipsBelow}
				<Pagination />
			</>
		)
	}

	return (
		<>
			<Toolbar />
			{chipsAbove}
			<DataGridTable />
			{chipsBelow}
			<Pagination />
			<SelectionBar />
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
	table: instance,
	components,
	cellTypes,
	children,
}: DataGridProps<TRow>) {
	const table = instance.table
	// Read cellTypes stored on the table instance by useDataGrid, merge with direct prop
	const tableCellTypes = (table as unknown as Record<symbol, unknown>)[CELL_TYPES_KEY] as CellTypeRegistry | undefined
	const resolvedCellTypes = { ...tableCellTypes, ...cellTypes }

	return (
		<CellTypesProvider types={resolvedCellTypes}>
			<GridComponentsProvider {...(components !== undefined ? { components } : {})}>
				<TableContext value={instance}>
					{children ?? <DefaultLayout />}
					{table.options.creating?.mode === 'modal' && <CreatingModal />}
					{table.options.editing?.mode === 'modal' && <EditingModal />}
					{table.options.deleting?.confirmation && <ConfirmDialogRenderer />}
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
	SelectionBar: typeof SelectionBar
	CreateTrigger: typeof CreateTrigger
	ColumnVisibilityTrigger: typeof ColumnVisibilityTrigger
	SortTrigger: typeof SortTrigger
	GlobalFilterInput: typeof GlobalFilterInput
	ActiveFiltersBar: typeof ActiveFiltersBar
	ClearFiltersButton: typeof ClearFiltersButton
	FilterPanel: typeof FilterPanel
	CreatingModal: typeof CreatingModal
	EditingModal: typeof EditingModal
	LoadingBody: typeof LoadingBody
	EmptyStateRow: typeof EmptyStateRow
	NoResultsRow: typeof NoResultsRow
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
DataGrid.SelectionBar = SelectionBar
DataGrid.CreateTrigger = CreateTrigger
DataGrid.ColumnVisibilityTrigger = ColumnVisibilityTrigger
DataGrid.SortTrigger = SortTrigger
DataGrid.GlobalFilterInput = GlobalFilterInput
DataGrid.ActiveFiltersBar = ActiveFiltersBar
DataGrid.ClearFiltersButton = ClearFiltersButton
DataGrid.FilterPanel = FilterPanel
DataGrid.CreatingModal = CreatingModal
DataGrid.EditingModal = EditingModal
DataGrid.LoadingBody = LoadingBody
DataGrid.EmptyStateRow = EmptyStateRow
DataGrid.NoResultsRow = NoResultsRow

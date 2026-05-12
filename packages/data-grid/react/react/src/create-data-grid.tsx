'use client'

import { createColumnHelper } from '@ez-kit/data-grid-core'

import { CellTypesProvider } from './cell-types-context'
import { GridComponentsProvider } from './components-context'
import { DataGrid } from './data-grid/data-grid'
import { useDataGrid } from './use-data-grid'

import type { CellTypeRegistry } from './cell-types-context'
import type { GridComponents } from './types'
import type { ColumnDef, ColumnHelper } from '@ez-kit/data-grid-core'

export type CreateDataGridOptions<TCellTypes extends CellTypeRegistry> = {
	components: Partial<GridComponents>
	cellTypes?: TCellTypes
}

/**
 * Factory for creating a typed DataGrid bundle pre-configured with UI components
 * and optional cell types. Returns a `defineColumns` helper typed to the registered
 * custom cell type keys so `type: 'my-type'` on columns is type-safe.
 *
 * This package contains **zero visual styling** — every visible primitive is
 * supplied via `components`. Pair with `import '@ez-kit/data-grid-react/styles.css'`
 * once at the kit / app root to apply the shared structural CSS
 * (positioning, layout, overflow, z-index, cursor). Visuals stay in the kit.
 *
 * @example
 * // With custom cell types
 * export const { DataGrid, useDataGrid, defineColumns } = extendDataGrid({
 *   rating: { view: RatingCellView, edit: RatingCellInput },
 * })
 */
export function createDataGrid<TCellTypes extends CellTypeRegistry = CellTypeRegistry>({
	components,
	cellTypes,
}: CreateDataGridOptions<TCellTypes>): {
	DataGrid: typeof DataGrid
	useDataGrid: typeof useDataGrid
	GridComponentsProvider: typeof GridComponentsProvider
	defineColumns: <TRow extends object>(
		defs: ColumnDef<TRow, Extract<keyof TCellTypes, string>>[],
	) => ColumnDef<TRow, Extract<keyof TCellTypes, string>>[]
	createColumnHelper: <TRow extends object>() => ColumnHelper<TRow, Extract<keyof TCellTypes, string>>
} {
	type DataGridProps = Parameters<typeof DataGrid>[0]
	function BoundDataGrid(props: DataGridProps) {
		return (
			<GridComponentsProvider components={components}>
				{cellTypes != null ? (
					<CellTypesProvider types={cellTypes}>
						<DataGrid {...props} />
					</CellTypesProvider>
				) : (
					<DataGrid {...props} />
				)}
			</GridComponentsProvider>
		)
	}
	BoundDataGrid.Toolbar = DataGrid.Toolbar
	BoundDataGrid.Table = DataGrid.Table
	BoundDataGrid.Header = DataGrid.Header
	BoundDataGrid.Body = DataGrid.Body
	BoundDataGrid.Row = DataGrid.Row
	BoundDataGrid.Cell = DataGrid.Cell
	BoundDataGrid.Pagination = DataGrid.Pagination
	BoundDataGrid.PageSizer = DataGrid.PageSizer
	BoundDataGrid.CreateTrigger = DataGrid.CreateTrigger
	BoundDataGrid.CreatingModal = DataGrid.CreatingModal
	BoundDataGrid.EditingModal = DataGrid.EditingModal
	BoundDataGrid.LoadingBody = DataGrid.LoadingBody
	BoundDataGrid.EmptyStateRow = DataGrid.EmptyStateRow
	BoundDataGrid.NoResultsRow = DataGrid.NoResultsRow

	function boundDefineColumns<TRow extends object>(
		defs: ColumnDef<TRow, Extract<keyof TCellTypes, string>>[],
	): ColumnDef<TRow, Extract<keyof TCellTypes, string>>[] {
		return defs
	}

	function boundCreateColumnHelper<TRow extends object>(): ColumnHelper<TRow, Extract<keyof TCellTypes, string>> {
			const customTypeKeys = Object.keys(cellTypes ?? {}) as Extract<keyof TCellTypes, string>[]
			return customTypeKeys.length > 0
				? createColumnHelper<TRow, Extract<keyof TCellTypes, string>>(customTypeKeys)
				: (createColumnHelper<TRow>() as ColumnHelper<TRow, Extract<keyof TCellTypes, string>>)
		}

	return {
		DataGrid: BoundDataGrid as typeof DataGrid,
		useDataGrid,
		GridComponentsProvider,
		defineColumns: boundDefineColumns,
		createColumnHelper: boundCreateColumnHelper,
	}
}

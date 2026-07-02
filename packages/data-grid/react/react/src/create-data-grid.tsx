'use client'

import { createColumnHelper } from '@ez-kit/data-grid-core'

import { CellTypesProvider } from './cell-types-context'
import { GridComponentsProvider } from './components-context'
import { DataGrid } from './data-grid/data-grid'
import { useDataGridStore } from './data-grid/table-context'
import { useDataGrid } from './use-data-grid'

import type { CellTypeRegistry } from './cell-types-context'
import type { GridComponents } from './contract'
import type { ColumnDef, ColumnHelper } from '@ez-kit/data-grid-core'

export type CreateDataGridOptions<TCellTypes extends CellTypeRegistry> = {
	components: Partial<GridComponents>
	cellTypes?: TCellTypes
}

/**
 * The bundle returned by {@link createDataGrid}: the bound compound `DataGrid`, the
 * hooks, the components provider, cell-type-aware column helpers, and `extendDataGrid`
 * — a re-invocation of the factory that reuses the same `components` while merging in
 * extra cell types (return typed to the merged key union).
 */
export type DataGridBundle<TCellTypes extends CellTypeRegistry> = {
	DataGrid: typeof DataGrid
	useDataGrid: typeof useDataGrid
	useDataGridStore: typeof useDataGridStore
	GridComponentsProvider: typeof GridComponentsProvider
	defineColumns: <TRow extends object>(
		defs: ColumnDef<TRow, Extract<keyof TCellTypes, string>>[],
	) => ColumnDef<TRow, Extract<keyof TCellTypes, string>>[]
	createColumnHelper: <TRow extends object>() => ColumnHelper<TRow, Extract<keyof TCellTypes, string>>
	extendDataGrid: <TExtra extends CellTypeRegistry>(extraCellTypes: TExtra) => DataGridBundle<TCellTypes & TExtra>
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
}: CreateDataGridOptions<TCellTypes>): DataGridBundle<TCellTypes> {
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
	BoundDataGrid.ActiveFiltersBar = DataGrid.ActiveFiltersBar
	BoundDataGrid.ClearFiltersButton = DataGrid.ClearFiltersButton
	BoundDataGrid.FilterPanel = DataGrid.FilterPanel
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

	function boundExtendDataGrid<TExtra extends CellTypeRegistry>(extraCellTypes: TExtra): DataGridBundle<TCellTypes & TExtra> {
		const mergedCellTypes = { ...cellTypes, ...extraCellTypes } as TCellTypes & TExtra
		return createDataGrid<TCellTypes & TExtra>({ components, cellTypes: mergedCellTypes })
	}

	return {
		DataGrid: BoundDataGrid as typeof DataGrid,
		useDataGrid,
		useDataGridStore,
		GridComponentsProvider,
		defineColumns: boundDefineColumns,
		createColumnHelper: boundCreateColumnHelper,
		extendDataGrid: boundExtendDataGrid,
	}
}

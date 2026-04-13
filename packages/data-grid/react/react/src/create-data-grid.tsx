import { GridComponentsProvider } from './components-context'
import { DataGrid } from './data-grid/data-grid'
import { useDataGrid } from './use-data-grid'

import type { GridComponents } from './types'

/**
 * Factory for creating a typed DataGrid bundle pre-configured with a set of
 * UI components. UI-kit packages (shadcn, heroui) use this to ship ready-to-use grids.
 *
 * @example
 * // packages/data-grid/react/shadcn/src/index.ts
 * export const { DataGrid, useDataGrid } = createDataGrid({
 *   Button: ShadcnButton,
 *   Input: ShadcnInput,
 *   Checkbox: ShadcnCheckbox,
 *   Modal: ShadcnDialog,
 * })
 */
export function createDataGrid(components: Partial<GridComponents>): {
	DataGrid: typeof DataGrid
	useDataGrid: typeof useDataGrid
	GridComponentsProvider: typeof GridComponentsProvider
} {
	console.log('components', components)
	// Wrap DataGrid so it always merges the factory-level components
	type DataGridProps = Parameters<typeof DataGrid>[0]
	function BoundDataGrid(props: DataGridProps) {
		return (
			<GridComponentsProvider components={components}>
				<DataGrid {...props} />
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

	return {
		DataGrid: BoundDataGrid as typeof DataGrid,
		useDataGrid,
		GridComponentsProvider,
	}
}

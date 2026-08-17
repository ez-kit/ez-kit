export { DataGrid, GridComponentsProvider, useDataGrid, extendDataGrid } from './data-grid'
export { cellTypes } from './blocks/cell-types'

// Curated re-export of the consumer surface from the adapter, so a kit consumer never has to
// add `@ez-kit/data-grid-react` as a second dependency. Deliberately not `export *`: the star
// would re-export the adapter's unbound `DataGrid`/`useDataGrid`/`GridComponentsProvider` and
// collide with the heroui-bound ones above.
export {
	CellTypesProvider,
	DataGridOptionsProvider,
	useDataGridOptions,
	createColumnHelper,
	createColumns,
	extractState,
	parseState,
	useExtractedState,
	ValidationError,
} from '@ez-kit/data-grid-react'
export type {
	ColumnDef,
	ColumnFiltersState,
	ColumnHelper,
	DataGridDefaultOptions,
	DataGridOptionsProviderProps,
	DataGridProps,
	DateRangePreset,
	SortingState,
	TableState,
} from '@ez-kit/data-grid-react'

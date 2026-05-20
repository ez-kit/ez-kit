'use client'

import { DataGrid as AdapterDataGrid } from '@ez-kit/data-grid-react'
import { createContext, lazy, Suspense, useContext } from 'react'

import type { DataGridProps } from '@ez-kit/data-grid-react'

export { useDataGrid } from '@ez-kit/data-grid-react'

const HeroUiDataGrid = lazy(() => import('@ez-kit/data-grid-heroui').then((module) => ({ default: module.DataGrid })))
const ShadcnDataGrid = lazy(() => import('@ez-kit/data-grid-shadcn').then((module) => ({ default: module.DataGrid })))

export const DataGridTypeContext = createContext<{ type: 'heroui' | 'shadcn' }>({ type: 'heroui' })

export function useDataGridType() {
	return useContext(DataGridTypeContext)
}

export const DataGridTypeProvider = ({ type, children }: { type: 'heroui' | 'shadcn'; children: React.ReactNode }) => {
	return <DataGridTypeContext.Provider value={{ type }}>{children}</DataGridTypeContext.Provider>
}

function DataGridBase<T extends object>(props: DataGridProps<T>) {
	const { type } = useDataGridType()
	const Component = type === 'heroui' ? HeroUiDataGrid : ShadcnDataGrid
	const componentProps = props as unknown as DataGridProps<object>

	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Component {...componentProps} />
		</Suspense>
	)
}

// Compound members are context-consumers — they read TableContext + GridComponentsProvider
// that the kit-specific bound DataGrid sets up internally. Re-attaching the adapter's
// versions here so docs examples can use `<DataGrid.Toolbar>`, `<DataGrid.FilterPanel>`,
// etc. without each docs route having to import them from a specific kit.
export const DataGrid: typeof DataGridBase & typeof AdapterDataGrid = Object.assign(DataGridBase, {
	Toolbar: AdapterDataGrid.Toolbar,
	Table: AdapterDataGrid.Table,
	Header: AdapterDataGrid.Header,
	Body: AdapterDataGrid.Body,
	Row: AdapterDataGrid.Row,
	Cell: AdapterDataGrid.Cell,
	Pagination: AdapterDataGrid.Pagination,
	PageSizer: AdapterDataGrid.PageSizer,
	SelectionBar: AdapterDataGrid.SelectionBar,
	CreateTrigger: AdapterDataGrid.CreateTrigger,
	ColumnVisibilityTrigger: AdapterDataGrid.ColumnVisibilityTrigger,
	SortTrigger: AdapterDataGrid.SortTrigger,
	GlobalFilterInput: AdapterDataGrid.GlobalFilterInput,
	ActiveFiltersBar: AdapterDataGrid.ActiveFiltersBar,
	ClearFiltersButton: AdapterDataGrid.ClearFiltersButton,
	FilterPanel: AdapterDataGrid.FilterPanel,
	CreatingModal: AdapterDataGrid.CreatingModal,
	EditingModal: AdapterDataGrid.EditingModal,
	LoadingBody: AdapterDataGrid.LoadingBody,
	EmptyStateRow: AdapterDataGrid.EmptyStateRow,
	NoResultsRow: AdapterDataGrid.NoResultsRow,
})

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
// that the kit-specific bound DataGrid sets up internally, so the adapter's versions work
// unchanged here and docs examples can use `<DataGrid.Toolbar>` etc. without importing from
// a specific kit. Copied wholesale rather than listed member by member: the hand-written list
// this replaced is exactly the shape that had already drifted five members behind inside
// `createDataGrid`.
export const DataGrid: typeof DataGridBase & typeof AdapterDataGrid = Object.assign(DataGridBase, AdapterDataGrid)

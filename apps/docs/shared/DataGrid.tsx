'use client'

import { createContext, useContext, lazy, Suspense } from 'react'

import type { DataGridProps } from '@ez-kit/data-grid-react'

export { useDataGrid } from '@ez-kit/data-grid-react'

const HeroUiDataGrid = lazy(() => import('@ez-kit/data-grid-heroui').then((module) => ({ default: module.Table })))
const ShadcnDataGrid = lazy(() => import('@ez-kit/data-grid-shadcn').then((module) => ({ default: module.DataGrid })))

export const DataGridTypeContext = createContext<{ type: 'heroui' | 'shadcn' }>({ type: 'heroui' })

export function useDataGridType() {
	return useContext(DataGridTypeContext)
}

export const DataGridTypeProvider = ({ type, children }: { type: 'heroui' | 'shadcn'; children: React.ReactNode }) => {
	return <DataGridTypeContext.Provider value={{ type }}>{children}</DataGridTypeContext.Provider>
}

export function DataGrid<T extends object>(props: DataGridProps<T>) {
	const { type } = useDataGridType()
	return (
		<Suspense fallback={<div>Loading...</div>}>
			{type === 'heroui' ? <HeroUiDataGrid {...props} /> : <ShadcnDataGrid {...props} />}
		</Suspense>
	)
}

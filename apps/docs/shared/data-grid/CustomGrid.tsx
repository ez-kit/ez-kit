'use client'

import { lazy, Suspense, useContext } from 'react'

import { DataGridTypeContext } from 'shared/DataGrid'

import type { DataGridProps } from '@ez-kit/data-grid-react'

export { useDataGrid } from '@ez-kit/data-grid-react'

const ShadcnCustomDataGrid = lazy(() => import('./custom-grid-shadcn').then((m) => ({ default: m.DataGrid })))
const HerouiCustomDataGrid = lazy(() => import('./custom-grid-heroui').then((m) => ({ default: m.DataGrid })))

export function CustomDataGrid<T extends object>(props: DataGridProps<T>) {
	const { type } = useContext(DataGridTypeContext)
	const Component = type === 'heroui' ? HerouiCustomDataGrid : ShadcnCustomDataGrid
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Component {...(props as unknown as DataGridProps<object>)} />
		</Suspense>
	)
}

'use client'

import { lazy, Suspense, useContext } from 'react'

import { DataGridTypeContext } from 'shared/DataGrid'

import type { TableFeatures } from '@ez-kit/data-grid-core/features'
import type { DataGridProps } from '@ez-kit/data-grid-react'

export { useDataGrid } from '@ez-kit/data-grid-react'

const ShadcnCustomDataGrid = lazy(() => import('./custom-grid-shadcn').then((m) => ({ default: m.DataGrid })))
const HerouiCustomDataGrid = lazy(() => import('./custom-grid-heroui').then((m) => ({ default: m.DataGrid })))

export function CustomDataGrid<TFeatures extends TableFeatures, TRow extends object>(
	props: DataGridProps<TFeatures, TRow>,
) {
	const { type } = useContext(DataGridTypeContext)
	const Component = type === 'heroui' ? HerouiCustomDataGrid : ShadcnCustomDataGrid
	const componentProps = props as unknown as DataGridProps<TableFeatures, object>

	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Component {...componentProps} />
		</Suspense>
	)
}

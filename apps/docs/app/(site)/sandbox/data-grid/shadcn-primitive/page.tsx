'use client'

import { Suspense } from 'react'

import { DataGridPrimitiveExample } from 'shared/data-grid/examples/DataGridPrimitiveExample'
import { DataGridTypeProvider } from 'shared/DataGrid'

export default function DataGridShadcnPrimitivePage() {
	return (
		<Suspense fallback={null}>
			<DataGridTypeProvider type='shadcn'>
				<DataGridPrimitiveExample />
			</DataGridTypeProvider>
		</Suspense>
	)
}

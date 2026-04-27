'use client'

import { DataGridPrimitiveExample } from 'shared/data-grid/examples/DataGridPrimitiveExample'
import { DataGridTypeProvider } from 'shared/DataGrid'

export default function DataGridShadcnPrimitivePage() {
	return (
		<DataGridTypeProvider type='shadcn'>
			<DataGridPrimitiveExample />
		</DataGridTypeProvider>
	)
}

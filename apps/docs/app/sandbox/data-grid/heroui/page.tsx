'use client'

import { Suspense } from 'react'

import { DataGridTabsExample } from 'shared/data-grid/examples/DataGridTabsExample'
import { DataGridTypeProvider } from 'shared/DataGrid'

export default function DataGridHeroUIPage() {
	return (
		<Suspense fallback={null}>
			<DataGridTypeProvider type='heroui'>
				<DataGridTabsExample />
			</DataGridTypeProvider>
		</Suspense>
	)
}

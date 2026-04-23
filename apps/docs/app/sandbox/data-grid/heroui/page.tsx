'use client'

import { DataGridTabsExample } from 'shared/data-grid/examples/DataGridTabsExample'
import { DataGridTypeProvider } from 'shared/DataGrid'

export default function DataGridHeroUIPage() {
	return (
		<DataGridTypeProvider type='heroui'>
			<DataGridTabsExample />
		</DataGridTypeProvider>
	)
}

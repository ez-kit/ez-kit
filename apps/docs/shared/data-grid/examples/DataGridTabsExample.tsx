'use client'

import { DataGridSandpackExample } from 'shared/data-grid/sandpack/DataGridSandpackExample'
import { useDataGridType } from 'shared/DataGrid'

import { DataGridExamplesBrowser } from './DataGridExamplesBrowser'

import type { DataGridExampleId } from './generated/data-grid-primitive'

export function DataGridTabsExample() {
	const { type } = useDataGridType()

	return (
		<DataGridExamplesBrowser
			renderExample={(exampleId: DataGridExampleId) => (
				<DataGridSandpackExample
					exampleId={exampleId}
					type={type}
				/>
			)}
		/>
	)
}

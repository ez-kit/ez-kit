'use client'

import { DataGrid, useDataGrid } from '@ez-kit/data-grid-shadcn'
import { useState } from 'react'

import { columns, INITIAL_DATA } from './_data'

export function RowPinningExample() {
	const [data] = useState(INITIAL_DATA)

	const table = useDataGrid({
		data,
		columns,
		pinning: { row: { top: true, bottom: true } },
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Click ··· on any row to pin it to the top or bottom. Click &quot;Unpin&quot; to release.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

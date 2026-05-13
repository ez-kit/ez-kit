'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function RowPinningPlainExample() {
	const [data] = useState(makeUsers(100))

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

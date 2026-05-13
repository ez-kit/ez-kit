'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function RowPinningStickyHeaderExample() {
	const [data] = useState(makeUsers(100))

	const table = useDataGrid({
		data,
		columns,
		pinning: { row: { top: true, bottom: true } },
		stickyHeader: true,
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Pinned rows stay locked to the top and bottom while the header sticks to the top of the
				scroll container. Container height is controlled by <code>--dg-table-max-height</code>{' '}
				(default 400px).
			</p>
			<DataGrid table={table} />
		</div>
	)
}

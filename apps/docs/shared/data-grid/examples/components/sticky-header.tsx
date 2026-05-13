'use client'

import { useMemo } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from './_data'

export function StickyHeaderExample() {
	const data = useMemo(() => makeUsers(50), [])

	const table = useDataGrid({
		data,
		columns,
		sorting: true,
		stickyHeader: true,
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				The header stays fixed while the table body scrolls. Container height is controlled by{' '}
				<code>--dg-table-max-height</code> (default 400px).
			</p>
			<DataGrid table={table} />
		</div>
	)
}

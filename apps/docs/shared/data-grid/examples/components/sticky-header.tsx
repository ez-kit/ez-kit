'use client'

import { useMemo } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, type User } from './_data'

function makeData(count: number): User[] {
	return Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		name: `User ${String(i + 1)}`,
		email: `user${String(i + 1)}@example.com`,
		age: 20 + (i % 50),
		active: i % 3 !== 0,
	}))
}

export function StickyHeaderExample() {
	const data = useMemo(() => makeData(50), [])

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

'use client'

import { DataGrid, useDataGrid } from '@ez-kit/data-grid-shadcn'
import { useMemo } from 'react'

import { columns, type User } from './_data'

const VIRTUAL_ROW_COUNT = 10_000

function makeVirtualData(): User[] {
	return Array.from({ length: VIRTUAL_ROW_COUNT }, (_, i) => ({
		id: i + 1,
		name: `User ${String(i + 1)}`,
		email: `user${String(i + 1)}@example.com`,
		age: 20 + (i % 50),
		active: i % 3 !== 0,
	}))
}

export function VirtualizedExample() {
	const data = useMemo(() => makeVirtualData(), [])

	const table = useDataGrid({
		data,
		columns,
		sorting: true,
		virtualized: { row: { estimateSize: 49, overscan: 10 } },
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Only visible rows are rendered. Scroll to see all {VIRTUAL_ROW_COUNT.toLocaleString()} rows. Container height
				is controlled by <code>--dg-virtual-height</code> (default 600px).
			</p>
			<DataGrid table={table} />
		</div>
	)
}

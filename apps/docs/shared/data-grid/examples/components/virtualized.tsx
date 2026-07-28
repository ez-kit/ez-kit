'use client'

import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

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

	return (
		<DataGrid
			data={data}
			columns={columns}
			sorting
			stickyHeader
			virtualized={{ row: { estimateSize: 49, overscan: 10 } }}
		/>
	)
}

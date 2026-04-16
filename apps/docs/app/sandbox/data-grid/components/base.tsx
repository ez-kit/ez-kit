'use client'

import { DataGrid, useDataGrid } from '@ez-kit/data-grid-shadcn'
import { useState } from 'react'

import { columns, INITIAL_DATA, type User } from './_data'

export function BaseExample() {
	const [data, setData] = useState(INITIAL_DATA)

	const table = useDataGrid({
		data,
		columns,
		sorting: true,
		filtering: true,
		pagination: { pageSize: 10 },
		pageSizer: { items: [3, 5, 10] },
		selection: true,
		editing: {
			mode: 'row',
			onSave: (rowId, values) => {
				setData((prev) => prev.map((row) => (row.id.toString() === rowId ? ({ ...row, ...values } as User) : row)))
				return true
			},
		},
		creating: {
			mode: 'pin-row',
			onSave: (values) => {
				setData((prev) => [...prev, values as User])
				return true
			},
		},
		deleting: {
			onDelete: (row) => {
				setData((prev) => prev.filter((r) => r.id !== row.original.id))
			},
		},
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Demonstrates sorting, filtering, pagination, selection, creating (row mode), editing (row mode), and deleting.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

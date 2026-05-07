'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA, type User } from '../_data'

export function CreatingPinRowExample() {
	const [data, setData] = useState(INITIAL_DATA)

	const table = useDataGrid({
		data,
		columns,
		sorting: true,
		pagination: { pageSize: 10 },
		creating: {
			mode: 'pin-row',
			onSave: (values) => {
				setData((prev) => [...prev, { id: Date.now(), ...values } as User])
				return true
			},
		},
		editing: {
			mode: 'row',
			onSave: (rowId, values) => {
				setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
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
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				A blank input row is pinned to the top of the table — always visible and ready to fill in.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

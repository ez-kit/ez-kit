'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA, type User } from '../_data'

export function CreatingRowExample() {
	const [data, setData] = useState(INITIAL_DATA)

	const table = useDataGrid({
		data,
		columns,
		sorting: true,
		pagination: { pageSize: 10 },
		creating: {
			mode: 'row',
			onSave: (values) => {
				setData((prev) => [...prev, { id: Date.now(), ...values } as User])
			},
		},
		editing: {
			mode: 'row',
			onSave: (rowId, values) => {
				setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
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
				Click <strong>Add row</strong> in the toolbar to open an inline form at the bottom of the table.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

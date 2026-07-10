'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA, type User } from '../_data'

export function CreatingModalExample() {
	const [data, setData] = useState(INITIAL_DATA)

	const table = useDataGrid({
		data,
		columns,
		sorting: true,
		pagination: { pageSize: 10 },
		creating: {
			mode: 'modal',
			onSave: ({ values }) => {
				setData((prev) => [...prev, { id: Date.now(), ...values } as User])
			},
		},
		editing: {
			mode: 'modal',
			onSave: ({ rowId, values }) => {
				setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
			},
		},
		deleting: {
			onDelete: ({ row }) => {
				setData((prev) => prev.filter((r) => r.id !== row.original.id))
			},
		},
	})

	return <DataGrid table={table} />
}

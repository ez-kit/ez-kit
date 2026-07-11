'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA, type User } from '../_data'

export function BaseFullExample() {
	const [data, setData] = useState(INITIAL_DATA)

	const table = useDataGrid({
		data,
		columns,
		sorting: true,
		filtering: true,
		pagination: { pageSize: 10 },
		pageSizer: { items: [3, 5, 10] },
		selection: true,
		columnVisibility: true,
		selectionBar: {
			onDelete: ({ selectedRows, clearSelection }) => {
				setData((prev) => prev.filter((row) => !selectedRows.some((r) => r.original === row)))
				clearSelection()
			},
		},
		editing: {
			mode: 'row',
			onSave: ({ rowId, values }) => {
				setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
			},
		},
		creating: {
			mode: 'pin-row',
			onSave: ({ values }) => {
				setData((prev) => [...prev, values as User])
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

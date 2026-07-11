'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, makeUsers, type User } from '../_data'

export function BaseEditingExample() {
	const [data, setData] = useState<User[]>(() => makeUsers(50))

	const table = useDataGrid({
		data,
		columns,
		pagination: { pageSize: 10 },
		pageSizer: { items: [5, 10, 25] },
		editing: {
			mode: 'row',
			onSave: ({ rowId, values }) => {
				setData((prev) =>
					prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)),
				)
			},
		},
	})

	return <DataGrid table={table} />
}

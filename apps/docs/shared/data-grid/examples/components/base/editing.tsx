'use client'

import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers, type User } from '../_data'

export function BaseEditingExample() {
	const [data, setData] = useState<User[]>(() => makeUsers(50))

	return (
		<DataGrid
			data={data}
			columns={columns}
			pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 25] }}
			editing={{
				variant: 'row',
				onSave: ({ rowId, values }) => {
					setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
				},
			}}
		/>
	)
}

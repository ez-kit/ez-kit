'use client'

import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers, type User } from '../_data'

export function BaseFullExample() {
	const [data, setData] = useState(() => makeUsers(1000))

	return (
		<DataGrid
			data={data}
			columns={columns}
			sorting
			filtering
			pagination={{ pageSize: 10, items: [10, 25, 50, 100] }}
			visibility
			selection
			editing={{
				mode: 'row',
				onSave: ({ rowId, values }) => {
					setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
				},
			}}
			creating={{
				mode: 'pin-row',
				onSave: ({ values }) => {
					setData((prev) => [...prev, values as User])
				},
			}}
			deleting={{
				onDelete: ({ row }) => {
					setData((prev) => prev.filter((r) => r.id !== row.original.id))
				},
				bulk: {
					onDelete: ({ rows }) => {
						const ids = new Set(rows.map((row) => row.original.id))
						setData((prev) => prev.filter((row) => !ids.has(row.id)))
					},
				},
			}}
		/>
	)
}

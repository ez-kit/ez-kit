'use client'

import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA, type User } from '../_data'

export function BaseFullExample() {
	const [data, setData] = useState(INITIAL_DATA)

	return (
		<DataGrid
			data={data}
			columns={columns}
			sorting
			filtering
			pagination={{ pageSize: 10, items: [3, 5, 10] }}
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
				// One word: with no handler of its own, bulk delete loops `onDelete` over the selection.
				bulk: true,
			}}
		/>
	)
}

'use client'

import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

import type { User } from '../_data'

/**
 * A custom "Duplicate" action alongside the built-in edit / delete.
 *
 * The entries are built per row, so the callback can read the row and decide what it offers —
 * here the copy is named after the row it came from, and inactive users cannot be duplicated.
 *
 * Row pinning is on to show the sharing rule: Duplicate and the pin actions sit behind the one
 * overflow trigger rather than each claiming a button of their own.
 */
export function RowActionsCustomExample() {
	const [data, setData] = useState(() => makeUsers(5))

	const duplicate = (user: User) => {
		setData((rows) => {
			const nextId = Math.max(...rows.map((row) => row.id)) + 1
			return [...rows, { ...user, id: nextId, name: `${user.name} (copy)` }]
		})
	}

	return (
		<DataGrid
			data={data}
			columns={columns}
			editing={{ mode: 'modal', onSave: () => Promise.resolve() }}
			pinning={{ row: { top: true } }}
			deleting={{
				onDelete: ({ row }) => {
					setData((rows) => rows.filter((user) => user.id !== row.original.id))
				},
			}}
			rowActions={{
				actions: ({ row }) => [
					{
						id: 'duplicate',
						label: 'Duplicate',
						disabled: !row.original.active,
						onSelect: () => {
							duplicate(row.original)
						},
					},
				],
			}}
		/>
	)
}

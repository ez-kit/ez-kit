'use client'

import { Copy, Send } from 'lucide-react'
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
						// No built-in glyph names "duplicate", so the entry brings its own element.
						icon: <Copy size={16} />,
						disabled: !row.original.active,
						onAction: () => {
							duplicate(row.original)
						},
					},
				],
			}}
		/>
	)
}

/**
 * The same Duplicate action asking to be an inline button instead of a menu entry.
 *
 * `placement: 'inline'` is the entry's own opt-in — an entry says nothing and stays in the
 * menu, whatever the column's placement is. The icon is required here for the obvious reason:
 * this one is drawn as an icon button, with no label beside it.
 *
 * The column's own `width` is set because the grid stops being able to size it: `actions` is a
 * function of the row, so how many buttons a row will render is not known when the column is
 * built. Four buttons at 32px with their gaps plus the cell's padding is 172px.
 */
export function RowActionsInlineCustomExample() {
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
			deleting={{
				onDelete: ({ row }) => {
					setData((rows) => rows.filter((user) => user.id !== row.original.id))
				},
			}}
			rowActions={{
				column: { width: 172 },
				actions: ({ row }) => [
					{
						id: 'duplicate',
						label: 'Duplicate',
						icon: <Copy size={16} />,
						placement: 'inline',
						disabled: !row.original.active,
						onAction: () => {
							duplicate(row.original)
						},
					},
					{
						id: 'invoice',
						label: 'Send invoice',
						icon: <Send size={16} />,
						placement: 'inline',
						onAction: () => undefined,
					},
				],
			}}
		/>
	)
}

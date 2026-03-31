'use client'

import { DataGrid, useDataGrid, defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

interface User {
	id: number
	name: string
	email: string
	age: number
	active: boolean
}

const INITIAL_DATA: User[] = [
	{ id: 1, name: 'Alice Johnson', email: 'alice@example.com', age: 30, active: true },
	{ id: 2, name: 'Bob Smith', email: 'bob@example.com', age: 25, active: false },
	{ id: 3, name: 'Carol White', email: 'carol@example.com', age: 35, active: true },
	{ id: 4, name: 'Dave Brown', email: 'dave@example.com', age: 28, active: true },
	{ id: 5, name: 'Eve Davis', email: 'eve@example.com', age: 32, active: false },
]

const columns = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

export default function DataGridSandboxPage() {
	const [data, setData] = useState(INITIAL_DATA)

	const table = useDataGrid({
		data: data,
		columns,
		sorting: true,
		filtering: true,
		pagination: { pageSize: 3 },
		selection: true,
		editing: {
			mode: 'row',
			onSave: async (rowId, values) => {
				console.log('Saving edit', rowId, values)
				return true
			},
		},
		creating: {
			mode: 'row',
			onSave: async (values) => {
				console.log('Saving new row', values)
				setData((prev) => [...prev, values])
				return true
			},
		},
		deleting: {
			onDelete: (row) => {
				console.log('Deleting row', row.original)
			},
		},
	})

	return (
		<div
			style={{ padding: '2rem' }}
			className='[&_input]:border-1 '
		>
			<h1>DataGrid Sandbox</h1>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Demonstrates sorting, filtering, pagination, selection, creating (row mode), editing (row mode), and deleting.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

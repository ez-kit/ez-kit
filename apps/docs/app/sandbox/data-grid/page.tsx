'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { DataGrid, useDataGrid } from '@ez-kit/data-grid-shadcn'
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

const resizableColumns = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name', size: 200, minSize: 80, maxSize: 400 },
	{ accessorKey: 'email', header: 'Email', size: 250, minSize: 120 },
	{ accessorKey: 'age', header: 'Age', size: 80, minSize: 50, maxSize: 150, cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', size: 100, enableResizing: false, cell: { type: 'boolean' } },
])

const BaseExample = () => {
	const [data, setData] = useState(INITIAL_DATA)

	const table = useDataGrid({
		data: data,
		columns,
		sorting: true,
		filtering: true,
		pagination: { pageSize: 10 },
		pageSizer: { items: [3, 5, 10] },
		selection: true,
		editing: {
			mode: 'row',
			onSave: (rowId, values) => {
				setData((prev) => prev.map((row) => (row.id.toString() === rowId ? ({ ...row, ...values } as User) : row)))
				return true
			},
		},
		creating: {
			mode: 'pin-row',
			onSave: (values) => {
				console.log('Saving new row', values)
				setData((prev) => [...prev, values as User])
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
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Demonstrates sorting, filtering, pagination, selection, creating (row mode), editing (row mode), and deleting.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

const ResizableOnChangeExample = () => {
	const [data] = useState(INITIAL_DATA)

	const resizableOnChange = useDataGrid({
		data,
		columns: resizableColumns,
		sorting: true,
		sizing: { mode: 'onChange' },
	})

	return (
		<div>
			<h2 style={{ marginTop: '3rem' }}>Column Resizing — onChange</h2>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Drag column borders to resize. Double-click to reset. &quot;Active&quot; column has resizing disabled.
			</p>
			<DataGrid table={resizableOnChange} />
		</div>
	)
}
const ResizableOnEndExample = () => {
	const [data] = useState(INITIAL_DATA)

	const resizableOnEnd = useDataGrid({
		data,
		columns: resizableColumns,
		sorting: true,
		sizing: { mode: 'onEnd' },
	})

	return (
		<div>
			<h2 style={{ marginTop: '3rem' }}>Column Resizing — onEnd (performant)</h2>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Width updates only after mouse release. No re-renders during drag.
			</p>
			<DataGrid table={resizableOnEnd} />
		</div>
	)
}

export default function DataGridSandboxPage() {
	return (
		<div
			style={{ padding: '2rem' }}
			className='[&_input]:border '
		>
			<h1>DataGrid Sandbox</h1>
			<BaseExample />

			<ResizableOnChangeExample />

			<ResizableOnEndExample />
		</div>
	)
}

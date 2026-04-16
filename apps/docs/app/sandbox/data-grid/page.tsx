'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { DataGrid, useDataGrid } from '@ez-kit/data-grid-shadcn'
import { useMemo, useState } from 'react'

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

const PinningExample = () => {
	const [data] = useState(INITIAL_DATA)

	const table = useDataGrid({
		data,
		columns,
		pinning: { row: { top: true, bottom: true } },
	})

	return (
		<div>
			<h2 style={{ marginTop: '3rem' }}>Row Pinning</h2>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Click ··· on any row to pin it to the top or bottom. Click &quot;Unpin&quot; to release.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

const colPinColumns = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name', pinning: { defaultPin: 'left' } },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' }, pinning: false },
])

const ColumnPinningExample = () => {
	const [data] = useState(INITIAL_DATA)

	const table = useDataGrid({
		data,
		columns: colPinColumns,
		sorting: true,
		pinning: { column: true },
	})

	return (
		<div>
			<h2 style={{ marginTop: '3rem' }}>Column Pinning</h2>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Click ⋮ next to a column header to pin left / right or unpin. &quot;Active&quot; column has pinning
				disabled.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

const VIRTUAL_ROW_COUNT = 10_000

function makeVirtualData(): User[] {
	return Array.from({ length: VIRTUAL_ROW_COUNT }, (_, i) => ({
		id: i + 1,
		name: `User ${String(i + 1)}`,
		email: `user${String(i + 1)}@example.com`,
		age: 20 + (i % 50),
		active: i % 3 !== 0,
	}))
}

const VirtualizedExample = () => {
	const data = useMemo(() => makeVirtualData(), [])

	const table = useDataGrid({
		data,
		columns,
		sorting: true,
		virtualized: { row: { estimateSize: 49, overscan: 10 } },
	})

	return (
		<div>
			<h2 style={{ marginTop: '3rem' }}>Virtualized Rows (10 000 rows)</h2>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Only visible rows are rendered. Scroll to see all {VIRTUAL_ROW_COUNT.toLocaleString()} rows.
				Container height is controlled by <code>--dg-virtual-height</code> (default 600px).
			</p>
			<DataGrid table={table} />
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

			<PinningExample />

			<ColumnPinningExample />

			<VirtualizedExample />

			<ResizableOnChangeExample />

			<ResizableOnEndExample />
		</div>
	)
}

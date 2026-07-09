'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { CustomDataGrid, useDataGrid } from 'shared/data-grid/CustomGrid'

type Task = {
	id: number
	title: string
	owner: string
	completion: number
}

const TASK_DATA: Task[] = [
	{ id: 1, title: 'Design system audit', owner: 'Alice', completion: 92 },
	{ id: 2, title: 'API migration', owner: 'Bob', completion: 64 },
	{ id: 3, title: 'Onboarding flow', owner: 'Carol', completion: 35 },
	{ id: 4, title: 'Billing rewrite', owner: 'Dave', completion: 18 },
	{ id: 5, title: 'Docs refresh', owner: 'Eve', completion: 100 },
]

const taskColumns = defineColumns<Task>([
	{ accessorKey: 'title', header: 'Task' },
	{ accessorKey: 'owner', header: 'Owner' },
	{ accessorKey: 'completion', header: 'Progress', cell: { type: 'progress' } },
])

export function CustomCellProgressExample() {
	const [data, setData] = useState(TASK_DATA)

	const table = useDataGrid({
		data,
		columns: taskColumns,
		sorting: true,
		editing: {
			mode: 'row',
			onSave: ({ rowId, values }) => {
				setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
			},
		},
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				A custom <code>progress</code> cell type — a colored bar for the view, a range slider + number input for
				editing. Click Edit on any row to drag the slider.
			</p>
			<CustomDataGrid table={table} />
		</div>
	)
}

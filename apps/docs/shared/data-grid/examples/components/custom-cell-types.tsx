'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { CustomDataGrid, useDataGrid } from 'shared/data-grid/CustomGrid'

type Employee = {
	id: number
	name: string
	department: string
	rating: number
	favoriteColor: string
}

const EMPLOYEE_DATA: Employee[] = [
	{ id: 1, name: 'Alice Johnson', department: 'Engineering', rating: 5, favoriteColor: '#6366f1' },
	{ id: 2, name: 'Bob Smith', department: 'Design', rating: 3, favoriteColor: '#ec4899' },
	{ id: 3, name: 'Carol White', department: 'Marketing', rating: 4, favoriteColor: '#10b981' },
	{ id: 4, name: 'Dave Brown', department: 'Engineering', rating: 2, favoriteColor: '#f59e0b' },
	{ id: 5, name: 'Eve Davis', department: 'Sales', rating: 5, favoriteColor: '#3b82f6' },
]

const employeeColumns = defineColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'rating', header: 'Rating', cell: { type: 'rating' } },
	{ accessorKey: 'favoriteColor', header: 'Color', cell: { type: 'color' } },
])

export function CustomCellTypesExample() {
	const [data, setData] = useState(EMPLOYEE_DATA)

	const table = useDataGrid({
		data,
		columns: employeeColumns,
		sorting: true,
		editing: {
			mode: 'row',
			onSave: (rowId, values) => {
				setData((prev) => prev.map((row) => (row.id.toString() === rowId ? ({ ...row, ...values }) : row)))
				return true
			},
		},
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Custom <code>rating</code> and <code>color</code> cell types added via <code>extendDataGrid()</code>. Click Edit
				on any row to try the custom inputs.
			</p>
			<CustomDataGrid table={table} />
		</div>
	)
}

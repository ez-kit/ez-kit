'use client'

import { DataGrid, useDataGrid } from '@ez-kit/data-grid-shadcn'

interface Employee {
	id: number
	name: string
	email: string
	role: string
	department: string
	salary: number
	startDate: string
}

const DATA: Employee[] = [
	{ id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer', department: 'Engineering', salary: 95000, startDate: '2021-03-15' },
	{ id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Designer', department: 'Design', salary: 85000, startDate: '2020-07-01' },
	{ id: 3, name: 'Carol White', email: 'carol@example.com', role: 'Manager', department: 'Engineering', salary: 110000, startDate: '2019-01-10' },
	{ id: 4, name: 'David Brown', email: 'david@example.com', role: 'Analyst', department: 'Finance', salary: 90000, startDate: '2022-05-20' },
	{ id: 5, name: 'Eve Davis', email: 'eve@example.com', role: 'Engineer', department: 'Engineering', salary: 100000, startDate: '2021-11-08' },
	{ id: 6, name: 'Frank Miller', email: 'frank@example.com', role: 'Designer', department: 'Design', salary: 82000, startDate: '2023-02-14' },
]

export function ColumnVisibilityExample() {
	const table = useDataGrid({
		data: DATA,
		columns: [
			{
				accessorKey: 'name',
				header: 'Name',
				// visibility: false — required column, cannot be hidden (no Hide option in menu)
				visibility: false,
			},
			{
				accessorKey: 'email',
				header: 'Email',
			},
			{
				accessorKey: 'role',
				header: 'Role',
			},
			{
				accessorKey: 'department',
				header: 'Department',
			},
			{
				accessorKey: 'salary',
				header: 'Salary',
				cell: { type: 'number' },
				// starts hidden, user can toggle it on via the Columns button
				visibility: { defaultHidden: true },
			},
			{
				accessorKey: 'startDate',
				header: 'Start Date',
				cell: { type: 'date' },
				// starts hidden, user can toggle it on via the Columns button
				visibility: { defaultHidden: true },
			},
		],
		sorting: true,
		// shows the "Columns" toggle button in the toolbar
		columnVisibility: { toolbar: true },
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				<strong>Name</strong> column is locked (cannot be hidden).{' '}
				<strong>Salary</strong> and <strong>Start Date</strong> are hidden by default.
				Use the <strong>Columns</strong> button or the column menu (⋯) to toggle visibility.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

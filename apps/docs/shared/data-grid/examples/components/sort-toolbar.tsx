'use client'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

type Employee = {
	id: number
	name: string
	department: string
	role: string
	salary: number
	startDate: string
}

const DATA: Employee[] = [
	{ id: 1, name: 'Alice Johnson', department: 'Engineering', role: 'Engineer', salary: 95000, startDate: '2021-03-15' },
	{ id: 2, name: 'Bob Smith', department: 'Design', role: 'Designer', salary: 85000, startDate: '2020-07-01' },
	{ id: 3, name: 'Carol White', department: 'Engineering', role: 'Manager', salary: 110000, startDate: '2019-01-10' },
	{ id: 4, name: 'David Brown', department: 'Finance', role: 'Analyst', salary: 90000, startDate: '2022-05-20' },
	{ id: 5, name: 'Eve Davis', department: 'Engineering', role: 'Engineer', salary: 100000, startDate: '2021-11-08' },
	{ id: 6, name: 'Frank Miller', department: 'Design', role: 'Designer', salary: 82000, startDate: '2023-02-14' },
	{ id: 7, name: 'Grace Kim', department: 'Engineering', role: 'Engineer', salary: 92000, startDate: '2022-09-03' },
	{ id: 8, name: 'Henry Adams', department: 'Finance', role: 'Manager', salary: 120000, startDate: '2018-04-22' },
	{ id: 9, name: 'Iris Chen', department: 'Design', role: 'Designer', salary: 78000, startDate: '2023-06-30' },
	{ id: 10, name: 'Jack Wilson', department: 'Engineering', role: 'Engineer', salary: 88000, startDate: '2022-01-15' },
]

export function SortToolbarExample() {
	const table = useDataGrid({
		data: DATA,
		columns: [
			{ accessorKey: 'name', header: 'Name' },
			{ accessorKey: 'department', header: 'Department' },
			{ accessorKey: 'role', header: 'Role' },
			{ accessorKey: 'salary', header: 'Salary', cell: { type: 'number' } },
			{ accessorKey: 'startDate', header: 'Start Date', cell: { type: 'date' } },
		],
		// Enables Sort button in the toolbar — opens a popover to manage multi-sort
		sorting: { toolbar: true },
	})

	return <DataGrid table={table} />
}

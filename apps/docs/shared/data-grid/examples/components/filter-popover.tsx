'use client'

import { createColumns } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

type Employee = {
	id: number
	name: string
	department: string
	salary: number
	joinedAt: string
	active: boolean
}

const DATA: Employee[] = [
	{ id: 1, name: 'Alice Johnson', department: 'Engineering', salary: 95000, joinedAt: '2021-03-15', active: true },
	{ id: 2, name: 'Bob Smith', department: 'Marketing', salary: 72000, joinedAt: '2020-07-01', active: false },
	{ id: 3, name: 'Carol White', department: 'Engineering', salary: 105000, joinedAt: '2019-11-20', active: true },
	{ id: 4, name: 'Dave Brown', department: 'Sales', salary: 68000, joinedAt: '2022-01-10', active: true },
	{ id: 5, name: 'Eve Davis', department: 'Engineering', salary: 88000, joinedAt: '2021-08-05', active: true },
	{ id: 6, name: 'Frank Lee', department: 'Marketing', salary: 61000, joinedAt: '2023-04-18', active: false },
	{ id: 7, name: 'Grace Kim', department: 'Sales', salary: 77000, joinedAt: '2020-12-30', active: true },
	{ id: 8, name: 'Hank Patel', department: 'Engineering', salary: 115000, joinedAt: '2018-06-25', active: true },
]

const basicColumns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'salary', header: 'Salary', cell: { type: 'number' } },
	{ accessorKey: 'joinedAt', header: 'Joined', cell: { type: 'date' } },
])

const withOperatorsColumns = createColumns<Employee>([
	{
		accessorKey: 'name',
		header: 'Name',
		filtering: { operators: true },
	},
	{
		accessorKey: 'department',
		header: 'Department',
		filtering: { operators: { items: ['contains', 'equals', 'isEmpty', 'isNotEmpty'] } },
	},
	{
		accessorKey: 'salary',
		header: 'Salary',
		cell: { type: 'number' },
		filtering: {
			operators: {
				betweenOperator: { variant: 'slider', min: 50000, max: 130000 },
			},
		},
	},
	{
		accessorKey: 'joinedAt',
		header: 'Joined',
		cell: { type: 'date' },
		filtering: { operators: true },
	},
])

export function FilterPopoverBasicExample() {
	return (
		<DataGrid
			data={DATA}
			columns={basicColumns}
			filtering={{ variant: 'popover' }}
			sorting
		/>
	)
}

export function FilterPopoverOperatorsExample() {
	return (
		<DataGrid
			data={DATA}
			columns={withOperatorsColumns}
			filtering={{ variant: 'popover' }}
			sorting
		/>
	)
}

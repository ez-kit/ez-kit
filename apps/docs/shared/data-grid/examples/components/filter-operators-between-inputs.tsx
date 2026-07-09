'use client'

import { defineColumns } from '@ez-kit/data-grid-react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA, type Employee } from './_data'

const columns = defineColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'salary',
		header: 'Salary',
		cell: { type: 'number' },
		filtering: {
			operators: {
				items: ['eq', 'between'],
				betweenOperator: { variant: 'inputs' },
			},
		},
	},
])

export function FilterOperatorsBetweenInputsExample() {
	const table = useDataGrid({ data: EMPLOYEE_DATA, columns, filtering: true })
	return <DataGrid table={table} />
}

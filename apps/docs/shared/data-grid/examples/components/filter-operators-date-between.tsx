'use client'

import { createColumns } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA, type Employee } from './_data'

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'joinedAt',
		header: 'Joined',
		cell: { type: 'date' },
		filtering: {
			operators: {
				items: ['equals', 'lessThan', 'greaterThan', 'between'],
				betweenOperator: { variant: 'inputs' },
			},
		},
	},
])

export function FilterOperatorsDateBetweenExample() {
	return (
		<DataGrid
			data={EMPLOYEE_DATA}
			columns={columns}
			filtering
		/>
	)
}

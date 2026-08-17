'use client'

import { createColumns } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA, type Employee } from './_data'

const columns = createColumns<Employee>([
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
])

export function FilterOperatorsTextExample() {
	return (
		<DataGrid
			data={EMPLOYEE_DATA}
			columns={columns}
			filtering
		/>
	)
}

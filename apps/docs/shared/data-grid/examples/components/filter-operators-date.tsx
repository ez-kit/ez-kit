'use client'

import { defineColumns } from '@ez-kit/data-grid-react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA, type Employee } from './_data'

const columns = defineColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'joinedAt',
		header: 'Joined',
		cell: { type: 'date' },
		filtering: { operators: true },
	},
])

export function FilterOperatorsDateExample() {
	const table = useDataGrid({ data: EMPLOYEE_DATA, columns, filtering: true })
	return <DataGrid table={table} />
}

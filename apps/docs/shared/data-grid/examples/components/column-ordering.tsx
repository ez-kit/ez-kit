'use client'

import { createColumns } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA } from './_data'

import type { Employee } from './_data'

const columns = createColumns<Employee>([
	// Locked where it was declared: the column menu offers it no move entries, and its
	// neighbours cannot step over it either.
	{ accessorKey: 'name', header: 'Name', ordering: false },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'joinedAt', header: 'Joined', cell: { type: 'date' } },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
])

export function ColumnOrderingExample() {
	return (
		<DataGrid
			data={EMPLOYEE_DATA}
			columns={columns}
			ordering
			sorting
			visibility
		/>
	)
}

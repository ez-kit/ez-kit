'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns, DataGrid } from '@ez-kit/data-grid-react'

import { DataGridDnd } from 'shared/DataGridDnd'

import { EMPLOYEE_DATA } from './_data'

import type { Employee } from './_data'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	sortFns,
	sortedRowModel: createSortedRowModel(),
})

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'joinedAt', header: 'Joined' },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
])

export function SortBuilderDragExample() {
	return (
		<DataGridDnd
			features={features}
			data={EMPLOYEE_DATA}
			columns={columns}
			getRowId={(row: Employee) => String(row.id)}
			initialState={{
				sorting: [
					{ id: 'department', desc: false },
					{ id: 'salary', desc: true },
					{ id: 'name', desc: false },
				],
			}}
			sorting={{ multi: true }}
		>
			<DataGrid.Toolbar end={<DataGrid.SortMenuTrigger />} />
			<DataGrid.Table />
		</DataGridDnd>
	)
}

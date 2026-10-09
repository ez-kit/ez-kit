'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	rowOrderingFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'

import { DataGridDnd } from 'shared/DataGridDnd'

import { makeEmployees } from './_data'

import type { Employee } from './_data'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowOrderingFeature,
	rowSortingFeature,
	rowSelectionFeature,
	sortFns,
	sortedRowModel: createSortedRowModel(),
})

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
])

const ROW_COUNT = 24

export function RowDragSortingSelectionExample() {
	return (
		<DataGridDnd
			features={features}
			data={makeEmployees(ROW_COUNT)}
			columns={columns}
			getRowId={(row: Employee) => String(row.id)}
			layout={{ stickyHeader: true, maxHeight: '420px' }}
			sorting
			selection={{}}
			ordering={{ row: true }}
		/>
	)
}

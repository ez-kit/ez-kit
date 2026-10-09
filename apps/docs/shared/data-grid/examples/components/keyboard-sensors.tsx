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

import { EMPLOYEE_DATA } from './_data'

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

export function KeyboardSensorsExample() {
	return (
		<div className='flex flex-col gap-2'>
			<DataGridDnd
				features={features}
				data={EMPLOYEE_DATA.slice(0, 8)}
				columns={columns}
				getRowId={(row: Employee) => String(row.id)}
				sorting
				selection={{}}
				ordering={{ row: true }}
			/>
		</div>
	)
}

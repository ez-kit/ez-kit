'use client'

import {
	columnOrderingFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
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
	columnOrderingFeature,
})

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'joinedAt', header: 'Joined' },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
])

export function ColumnPanelDragBasicExample() {
	return (
		<DataGridDnd
			features={features}
			data={EMPLOYEE_DATA.slice(0, 5)}
			columns={columns}
			getRowId={(row: Employee) => String(row.id)}
			visibility
			ordering={{ column: { visibilityMenu: true } }}
		/>
	)
}

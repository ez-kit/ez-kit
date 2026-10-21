'use client'

import { DEFAULT_OPERATOR_ICONS } from '@ez-kit/data-grid-core'
import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	filterFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA, type Employee } from './_data'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnFilteringFeature,
	filterFns,
	filteredRowModel: createFilteredRowModel(),
})

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'salary', header: 'Salary', cell: { type: 'number' } },
	{ accessorKey: 'department', header: 'Department', filtering: { operators: false } },
])

export function FilterOperatorsIconsExample() {
	return (
		<DataGrid
			features={features}
			data={EMPLOYEE_DATA}
			columns={columns}
			filtering={{ operators: true }}
			icons={{ operators: DEFAULT_OPERATOR_ICONS }}
		/>
	)
}

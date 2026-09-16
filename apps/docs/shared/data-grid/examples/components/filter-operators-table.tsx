'use client'

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
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnFilteringFeature,
	filterFns,
	filteredRowModel: createFilteredRowModel(),
})

// Nothing here mentions operators: the table switches them on for every column, and each one
// offers what its `cell.type` declares. `department` opts out — its filter is a plain input.
const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'salary', header: 'Salary', cell: { type: 'number' } },
	{ accessorKey: 'department', header: 'Department', filtering: { operators: false } },
])

export function FilterOperatorsTableExample() {
	return (
		<DataGrid
			features={features}
			data={EMPLOYEE_DATA}
			columns={columns}
			filtering={{ operators: true }}
		/>
	)
}

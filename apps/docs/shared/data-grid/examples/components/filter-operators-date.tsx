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

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'joinedAt',
		header: 'Joined',
		cell: { type: 'date' },
		filtering: { operators: true },
	},
])

export function FilterOperatorsDateExample() {
	return (
		<DataGrid
			features={features}
			data={EMPLOYEE_DATA}
			columns={columns}
			filtering
		/>
	)
}

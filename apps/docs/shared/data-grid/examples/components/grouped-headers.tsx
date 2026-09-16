'use client'

import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createSortedRowModel,
	filterFns,
	rowSortingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA } from './_data'

import type { Employee } from './_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	columnFilteringFeature,
	filterFns,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
})

/**
 * Two header rows: a group row whose cells span their children, and the leaf row that carries
 * the sorting, filtering and resizing affordances. A group header has no accessor of its own —
 * it exists to span, so it takes `id` + `header` + `columns`.
 */
const groupedColumns = createColumns<Employee>([
	{
		id: 'person',
		header: 'Person',
		columns: [
			{ accessorKey: 'name', header: 'Name' },
			{ accessorKey: 'department', header: 'Department' },
		],
	},
	{
		id: 'employment',
		header: 'Employment',
		columns: [
			{ accessorKey: 'joinedAt', header: 'Joined', cell: { type: 'date' } },
			{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
		],
	},
])

export function GroupedHeadersExample() {
	return (
		<DataGrid
			features={features}
			data={EMPLOYEE_DATA}
			columns={groupedColumns}
			sorting
		/>
	)
}

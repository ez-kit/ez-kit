'use client'

import {
	columnOrderingFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	rowSortingFeature,
	sortFns,
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
	columnOrderingFeature,
	sortFns,
	sortedRowModel: createSortedRowModel(),
})

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
			features={features}
			data={EMPLOYEE_DATA}
			columns={columns}
			ordering
			sorting
			visibility
		/>
	)
}

const panelColumns = createColumns<Employee>([
	// Never hideable, so the panel lists it with its checkbox disabled — it still holds a place
	// in the order, and it can still be moved.
	{ accessorKey: 'name', header: 'Name', visibility: false },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'joinedAt', header: 'Joined', cell: { type: 'date' } },
	// Locked the other way round: hideable, but fixed where it was declared.
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' }, ordering: false },
])

export function ColumnPanelOrderingExample() {
	return (
		<DataGrid
			features={features}
			data={EMPLOYEE_DATA}
			columns={panelColumns}
			ordering={{ column: { visibilityMenu: true } }}
			sorting
			visibility
		/>
	)
}

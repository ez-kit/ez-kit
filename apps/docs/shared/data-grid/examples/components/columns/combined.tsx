'use client'

import {
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { INITIAL_DATA, type User } from '../_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnResizingFeature,
	rowSortingFeature,
	sortFns,
	sortedRowModel: createSortedRowModel(),
})

const combinedColumns = createColumns<User>([
	{
		accessorKey: 'name',
		header: 'Name',
		width: { default: 200, min: 80, max: 400 },
		pinning: { initialSide: 'start' },
	},
	{ accessorKey: 'email', header: 'Email', width: { default: 250, min: 120 } },
	{
		accessorKey: 'age',
		header: 'Age',
		width: { default: 80, min: 50, max: 150 },
		align: 'end',
		cell: { type: 'number' },
	},
	{
		accessorKey: 'active',
		header: 'Active',
		width: 100,
		align: 'center',
		resizing: false,
		cell: { type: 'boolean' },
		pinning: { initialSide: 'end' },
		visibility: { initialHidden: true },
	},
])

export function ColumnsCombinedExample() {
	const [data] = useState<User[]>(INITIAL_DATA)

	return (
		<DataGrid
			features={features}
			data={data}
			columns={combinedColumns}
			sorting
			visibility
			pinning={{ column: true }}
			resizing={{ mode: 'onEnd' }}
		/>
	)
}

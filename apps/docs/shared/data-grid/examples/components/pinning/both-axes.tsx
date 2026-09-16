'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	rowPinningFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from '../_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowPinningFeature,
})

const bothAxesColumns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name', width: 200, pinning: { initialSide: 'start' } },
	{ accessorKey: 'email', header: 'Email', width: 260 },
	{ accessorKey: 'age', header: 'Age', width: 220, cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', width: 220, cell: { type: 'boolean' } },
])

export function PinningBothAxesExample() {
	const [data] = useState(() => makeUsers(60))

	return (
		<DataGrid
			features={features}
			data={data}
			columns={bothAxesColumns}
			pinning={{ column: true, row: { top: true, bottom: true } }}
			layout={{ stickyHeader: true, maxHeight: '24rem' }}
		/>
	)
}

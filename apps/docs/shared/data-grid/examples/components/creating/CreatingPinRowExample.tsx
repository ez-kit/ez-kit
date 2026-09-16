'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createPaginatedRowModel,
	createSortedRowModel,
	creatingFeature,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA, type User } from '../_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	creatingFeature,
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

export function CreatingPinRowExample() {
	const [data, setData] = useState(INITIAL_DATA)

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			sorting
			pagination={{ pageSize: 10 }}
			creating={{
				mode: 'pin-row',
				onSave: ({ values }) => {
					setData((prev) => [...prev, { id: Date.now(), ...values } as User])
				},
			}}
		/>
	)
}

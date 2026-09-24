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
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { INITIAL_DATA, resizableColumns } from '../_data'

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

export function ResizingOnChangeExample() {
	const [data] = useState(INITIAL_DATA)

	return (
		<DataGrid
			features={features}
			data={data}
			columns={resizableColumns}
			sorting
			resizing={{ mode: 'onChange' }}
		/>
	)
}

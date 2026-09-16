'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	rowPinningFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowPinningFeature,
})

export function RowPinningStickyHeaderExample() {
	const [data] = useState(makeUsers(100))

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			pinning={{ row: { top: true, bottom: true } }}
			layout={{ stickyHeader: true }}
		/>
	)
}

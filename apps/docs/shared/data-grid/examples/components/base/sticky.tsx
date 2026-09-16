'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createPaginatedRowModel,
	rowPaginationFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel(),
})

export function BaseStickyExample() {
	const data = useMemo(() => makeUsers(50), [])

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			layout={{ stickyHeader: true }}
			pagination={{ pageSize: 25, items: [10, 25, 50] }}
		/>
	)
}

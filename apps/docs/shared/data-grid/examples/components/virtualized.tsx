'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	rowSortingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, type User } from './_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
})

const VIRTUAL_ROW_COUNT = 10_000

function makeVirtualData(): User[] {
	return Array.from({ length: VIRTUAL_ROW_COUNT }, (_, i) => ({
		id: i + 1,
		name: `User ${String(i + 1)}`,
		email: `user${String(i + 1)}@example.com`,
		age: 20 + (i % 50),
		active: i % 3 !== 0,
	}))
}

export function VirtualizedExample() {
	const data = useMemo(() => makeVirtualData(), [])

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			sorting
			layout={{ stickyHeader: true }}
			virtualization={{ row: { estimateSize: 49, overscan: 10 } }}
		/>
	)
}

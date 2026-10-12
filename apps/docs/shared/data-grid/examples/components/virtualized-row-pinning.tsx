'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	rowPinningFeature,
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
	rowPinningFeature,
})

const VIRTUAL_ROW_COUNT = 10_000
const ROW_HEIGHT = 49
const OVERSCAN = 10

function makeVirtualData(): User[] {
	return Array.from({ length: VIRTUAL_ROW_COUNT }, (_, i) => ({
		id: i + 1,
		name: `User ${String(i + 1)}`,
		email: `user${String(i + 1)}@example.com`,
		age: 20 + (i % 50),
		active: i % 3 !== 0,
	}))
}

/**
 * The one combination the virtualized body's geometry was never measured against: a pinned row
 * above the window and one below it, sharing the tbody with the band.
 *
 * Both pinned ids are at the ends of the model so that the bands are never also inside the window,
 * which is what makes the band's own offset readable in isolation.
 */
export function VirtualizedRowPinningExample() {
	const data = useMemo(() => makeVirtualData(), [])

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			pinning={{ row: true }}
			initialState={{ rowPinning: { top: ['1'], bottom: [String(VIRTUAL_ROW_COUNT)] } }}
			layout={{ stickyHeader: true }}
			virtualization={{ row: { estimateSize: ROW_HEIGHT, overscan: OVERSCAN } }}
		/>
	)
}

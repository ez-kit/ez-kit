'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	infiniteFeature,
	loadingFeature,
	rowPaginationFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'

import { DataGrid } from 'shared/DataGrid'

import { columns } from '../_data'

import { usePagedUsers } from './_use-paged-users'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	infiniteFeature,
	rowPaginationFeature,
	loadingFeature,
})

/**
 * Infinite scroll combined with row virtualization. Detection switches to the
 * virtualizer's last rendered index, so only visible rows render while pages
 * keep loading on scroll. Page 1 loads on mount.
 */
export function InfiniteScrollVirtualizedExample() {
	const { data, state, hasNextPage, onLoadMore } = usePagedUsers()

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			state={state}
			layout={{ stickyHeader: true }}
			virtualization={{ row: { estimateSize: 49, overscan: 10 } }}
			pagination={{ mode: 'infinite', hasNextPage, onLoadMore, threshold: { rows: 8 } }}
		/>
	)
}

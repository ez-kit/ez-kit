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
 * Auto infinite scroll. The grid detects the bottom edge and calls `onLoadMore`;
 * the consumer owns the data (fetch + append into React state) and declares
 * `hasNextPage` from the API response. Page 1 loads on mount.
 */
export function InfiniteScrollAutoExample() {
	const { data, state, hasNextPage, onLoadMore } = usePagedUsers()

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			state={state}
			layout={{ stickyHeader: true }}
			pagination={{ mode: 'infinite', hasNextPage, onLoadMore }}
		/>
	)
}

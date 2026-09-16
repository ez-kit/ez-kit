'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	infiniteFeature,
	loadingFeature,
	rowPaginationFeature,
	rowSortingFeature,
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
	rowSortingFeature,
	infiniteFeature,
	rowPaginationFeature,
	loadingFeature,
	sortedRowModel: createSortedRowModel(),
})

/**
 * Reset on query change. With server-side (`manual`) sorting, the accumulated rows
 * belong to the previous query, so on sort change the consumer drops them and
 * refetches page 1 with the new sort (`reset`). The grid handles its own side
 * (clears error, re-arms detection, scrolls to top).
 */
export function InfiniteScrollResetExample() {
	const { data, state, hasNextPage, onLoadMore, reset } = usePagedUsers()

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			state={state}
			layout={{ stickyHeader: true }}
			sorting={{
				manual: true,
				onChange: (sorting) => {
					const first = sorting[0]
					void reset(first ? { id: first.id, desc: first.desc } : undefined)
				},
			}}
			pagination={{ mode: 'infinite', hasNextPage, onLoadMore }}
		/>
	)
}

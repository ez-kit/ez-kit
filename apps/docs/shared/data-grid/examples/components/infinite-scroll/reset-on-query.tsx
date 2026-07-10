'use client'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns } from '../_data'

import { usePagedUsers } from './_use-paged-users'

/**
 * Reset on query change. With server-side (`manual`) sorting, the accumulated rows
 * belong to the previous query, so on sort change the consumer drops them and
 * refetches page 1 with the new sort (`reset`). The grid handles its own side
 * (clears error, re-arms detection, scrolls to top).
 */
export function InfiniteScrollResetExample() {
	const { data, state, hasNextPage, onLoadMore, reset } = usePagedUsers()

	const table = useDataGrid({
		data,
		columns,
		state,
		stickyHeader: true,
		sorting: {
			manual: true,
			onChange: (sorting) => {
				const first = sorting[0]
				void reset(first ? { id: first.id, desc: first.desc } : undefined)
			},
		},
		pagination: { mode: 'infinite', hasNextPage, onLoadMore },
	})

	return <DataGrid table={table} />
}

'use client'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns } from '../_data'

import { usePagedUsers } from './_use-paged-users'

/**
 * Manual infinite scroll. Auto detection is off; a "Load more" button (the injected
 * `LoadMoreRow`) drives the same `onLoadMore`. Page 1 still loads on mount; only
 * subsequent pages require the button.
 */
export function InfiniteScrollManualExample() {
	const { data, state, hasNextPage, onLoadMore } = usePagedUsers()

	const table = useDataGrid({
		data,
		columns,
		state,
		stickyHeader: true,
		pagination: { mode: 'infinite', trigger: 'manual', hasNextPage, onLoadMore },
	})

	return <DataGrid table={table} />
}

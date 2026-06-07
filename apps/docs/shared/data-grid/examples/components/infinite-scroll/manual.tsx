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

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				Click <strong>Load more</strong> to fetch the next page — nothing loads on scroll alone.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

'use client'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns } from '../_data'

import { usePagedUsers } from './_use-paged-users'

/**
 * Auto infinite scroll. The grid detects the bottom edge and calls `onLoadMore`;
 * the consumer owns the data (fetch + append into React state) and declares
 * `hasNextPage` from the API response. Page 1 loads on mount.
 */
export function InfiniteScrollAutoExample() {
	const { data, state, hasNextPage, onLoadMore } = usePagedUsers()

	const table = useDataGrid({
		data,
		columns,
		state,
		stickyHeader: true,
		pagination: { mode: 'infinite', hasNextPage, onLoadMore },
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				Scroll to the bottom — the next page loads automatically until the data is exhausted.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

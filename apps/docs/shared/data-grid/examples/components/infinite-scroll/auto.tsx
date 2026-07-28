'use client'

import { DataGrid } from 'shared/DataGrid'

import { columns } from '../_data'

import { usePagedUsers } from './_use-paged-users'

/**
 * Auto infinite scroll. The grid detects the bottom edge and calls `onLoadMore`;
 * the consumer owns the data (fetch + append into React state) and declares
 * `hasNextPage` from the API response. Page 1 loads on mount.
 */
export function InfiniteScrollAutoExample() {
	const { data, state, hasNextPage, onLoadMore } = usePagedUsers()

	return (
		<DataGrid
			data={data}
			columns={columns}
			state={state}
			stickyHeader
			pagination={{ mode: 'infinite', hasNextPage, onLoadMore }}
		/>
	)
}

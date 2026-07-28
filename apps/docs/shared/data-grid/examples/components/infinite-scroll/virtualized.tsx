'use client'

import { DataGrid } from 'shared/DataGrid'

import { columns } from '../_data'

import { usePagedUsers } from './_use-paged-users'

/**
 * Infinite scroll combined with row virtualization. Detection switches to the
 * virtualizer's last rendered index, so only visible rows render while pages
 * keep loading on scroll. Page 1 loads on mount.
 */
export function InfiniteScrollVirtualizedExample() {
	const { data, state, hasNextPage, onLoadMore } = usePagedUsers()

	return (
		<DataGrid
			data={data}
			columns={columns}
			state={state}
			stickyHeader
			virtualized={{ row: { estimateSize: 49, overscan: 10 } }}
			pagination={{ mode: 'infinite', hasNextPage, onLoadMore, threshold: { rows: 8 } }}
		/>
	)
}

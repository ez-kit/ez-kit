'use client'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns } from '../_data'

import { usePagedUsers } from './_use-paged-users'

/**
 * Infinite scroll combined with row virtualization. Detection switches to the
 * virtualizer's last rendered index, so only visible rows render while pages
 * keep loading on scroll. Page 1 loads on mount.
 */
export function InfiniteScrollVirtualizedExample() {
	const { data, state, hasNextPage, onLoadMore } = usePagedUsers()

	const table = useDataGrid({
		data,
		columns,
		state,
		stickyHeader: true,
		virtualized: { row: { estimateSize: 49, overscan: 10 } },
		pagination: { mode: 'infinite', hasNextPage, onLoadMore, threshold: { rows: 8 } },
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				Virtualized + infinite: rows render on demand and pages load as you approach the end.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

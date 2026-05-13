'use client'

import { useMemo } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function BaseStickyExample() {
	const data = useMemo(() => makeUsers(50), [])

	const table = useDataGrid({
		data,
		columns,
		stickyHeader: true,
		pagination: { pageSize: 25 },
		pageSizer: { items: [10, 25, 50] },
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				The header stays fixed while the body scrolls. Container height is controlled by{' '}
				<code>--dg-table-max-height</code>.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

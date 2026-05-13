'use client'

import { useMemo } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function BaseFilteringExample() {
	const data = useMemo(() => makeUsers(50), [])

	const table = useDataGrid({
		data,
		columns,
		filtering: true,
		pagination: { pageSize: 10 },
		pageSizer: { items: [5, 10, 25] },
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				Type into the column filter inputs to narrow down rows.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

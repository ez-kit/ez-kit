'use client'

import { useMemo } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function BaseColumnVisibilityExample() {
	const data = useMemo(() => makeUsers(50), [])

	const table = useDataGrid({
		data,
		columns,
		columnVisibility: { toolbar: true },
		pagination: { pageSize: 10 },
		pageSizer: { items: [5, 10, 25] },
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				Use the <strong>Columns</strong> button in the toolbar to toggle column visibility.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

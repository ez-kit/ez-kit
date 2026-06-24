'use client'

import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

export function BaseInlineExample() {
	const data = useMemo(() => makeUsers(50), [])

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				No <code>useDataGrid</code> call — the grid takes the same config inline and runs the hook
				for you. Use this for simple, single-component grids.
			</p>
			<DataGrid
				data={data}
				columns={columns}
				sorting
				pagination={{ pageSize: 10 }}
				pageSizer={{ items: [5, 10, 25] }}
			/>
		</div>
	)
}

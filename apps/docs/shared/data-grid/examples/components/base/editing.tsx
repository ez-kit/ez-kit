'use client'

import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { columns, makeUsers, type User } from '../_data'

export function BaseEditingExample() {
	const [data, setData] = useState<User[]>(() => makeUsers(50))

	const table = useDataGrid({
		data,
		columns,
		pagination: { pageSize: 10 },
		pageSizer: { items: [5, 10, 25] },
		editing: {
			mode: 'row',
			onSave: (rowId, values) => {
				setData((prev) =>
					prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)),
				)
			},
		},
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				Click the row menu (⋮) to edit a row inline. Changes are saved back into local state.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

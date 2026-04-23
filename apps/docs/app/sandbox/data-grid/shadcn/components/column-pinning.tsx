'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { DataGrid, useDataGrid } from '@ez-kit/data-grid-shadcn'
import { useState } from 'react'

import { INITIAL_DATA, type User } from './_data'

const colPinColumns = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name', pinning: { defaultPin: 'left' } },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' }, pinning: false },
])

export function ColumnPinningExample() {
	const [data] = useState(INITIAL_DATA)

	const table = useDataGrid({
		data,
		columns: colPinColumns,
		sorting: true,
		pinning: { column: true },
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Click ⋮ next to a column header to pin left / right or unpin. &quot;Active&quot; column has pinning disabled.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

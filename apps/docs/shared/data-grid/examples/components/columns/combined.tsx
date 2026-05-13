'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { INITIAL_DATA, type User } from '../_data'

const combinedColumns = defineColumns<User>([
	{
		accessorKey: 'name',
		header: 'Name',
		size: 200,
		minSize: 80,
		maxSize: 400,
		pinning: { defaultPin: 'left' },
	},
	{ accessorKey: 'email', header: 'Email', size: 250, minSize: 120 },
	{
		accessorKey: 'age',
		header: 'Age',
		size: 80,
		minSize: 50,
		maxSize: 150,
		cell: { type: 'number' },
	},
	{
		accessorKey: 'active',
		header: 'Active',
		size: 100,
		enableResizing: false,
		cell: { type: 'boolean' },
		pinning: { defaultPin: 'right' },
		visibility: { defaultHidden: true },
	},
])

export function ColumnsCombinedExample() {
	const [data] = useState<User[]>(INITIAL_DATA)

	const table = useDataGrid({
		data,
		columns: combinedColumns,
		sorting: true,
		columnVisibility: { toolbar: true },
		pinning: { column: true },
		sizing: { mode: 'onEnd' },
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				Visibility, pinning and resizing combined. Drag column borders to resize. Pin a column via the ⋮ menu. Toggle
				columns through the <strong>Columns</strong> button. <strong>Active</strong> starts hidden.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

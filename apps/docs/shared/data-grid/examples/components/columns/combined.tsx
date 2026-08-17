'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { INITIAL_DATA, type User } from '../_data'

const combinedColumns = createColumns<User>([
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

	return (
		<DataGrid
			data={data}
			columns={combinedColumns}
			sorting
			columnVisibility={{ toolbar: true }}
			pinning={{ column: true }}
			sizing={{ mode: 'onEnd' }}
		/>
	)
}

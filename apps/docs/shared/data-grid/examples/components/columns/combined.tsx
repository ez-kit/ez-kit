'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { INITIAL_DATA, type User } from '../_data'

const combinedColumns = createColumns<User>([
	{
		accessorKey: 'name',
		header: 'Name',
		width: { default: 200, min: 80, max: 400 },
		pinning: { initialSide: 'left' },
	},
	{ accessorKey: 'email', header: 'Email', width: { default: 250, min: 120 } },
	{
		accessorKey: 'age',
		header: 'Age',
		width: { default: 80, min: 50, max: 150 },
		align: 'end',
		cell: { type: 'number' },
	},
	{
		accessorKey: 'active',
		header: 'Active',
		width: 100,
		align: 'center',
		resizing: false,
		cell: { type: 'boolean' },
		pinning: { initialSide: 'right' },
		visibility: { initialHidden: true },
	},
])

export function ColumnsCombinedExample() {
	const [data] = useState<User[]>(INITIAL_DATA)

	return (
		<DataGrid
			data={data}
			columns={combinedColumns}
			sorting
			visibility={{ toolbar: true }}
			pinning={{ column: true }}
			resizing={{ mode: 'onEnd' }}
		/>
	)
}

'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from '../_data'

const bothAxesColumns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name', width: 200, pinning: { initialSide: 'left' } },
	{ accessorKey: 'email', header: 'Email', width: 260 },
	{ accessorKey: 'age', header: 'Age', width: 220, cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', width: 220, cell: { type: 'boolean' } },
])

export function PinningBothAxesExample() {
	const [data] = useState(() => makeUsers(60))

	return (
		<DataGrid
			data={data}
			columns={bothAxesColumns}
			pinning={{ column: true, row: { top: true, bottom: true } }}
			layout={{ stickyHeader: true, maxHeight: '24rem' }}
		/>
	)
}

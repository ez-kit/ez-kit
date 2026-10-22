'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers } from '../_data'

import type { User } from '../_data'

const columns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name', filtering: { placeholder: 'e.g. Ada' } },
	{ accessorKey: 'email', header: 'Email', filtering: { placeholder: 'Part of an address' } },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

export function BaseFilteringExample() {
	const data = useMemo(() => makeUsers(50), [])

	return (
		<DataGrid
			data={data}
			columns={columns}
			filtering
			pagination={{ pageSize: 10, items: [5, 10, 25] }}
		/>
	)
}

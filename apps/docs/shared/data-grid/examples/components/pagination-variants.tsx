'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from './_data'

const PAGE_SIZE = 10
const ROW_TOTAL = 50
// Enough pages that the numbered strip has to window (1 … 4 5 6 … 100) rather than list them all.
const NUMBERED_ROW_TOTAL = 1000

const columns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
])

export function PaginationVariantNumberedExample() {
	const data = useMemo(() => makeUsers(NUMBERED_ROW_TOTAL), [])
	return (
		<DataGrid
			data={data}
			columns={columns}
			pagination={{ pageSize: PAGE_SIZE, variant: 'numbered' }}
		/>
	)
}

export function PaginationVariantSimpleExample() {
	const data = useMemo(() => makeUsers(ROW_TOTAL), [])
	return (
		<DataGrid
			data={data}
			columns={columns}
			pagination={{ pageSize: PAGE_SIZE, variant: 'simple' }}
		/>
	)
}

export function PaginationVariantCompactExample() {
	const data = useMemo(() => makeUsers(ROW_TOTAL), [])
	return (
		<DataGrid
			data={data}
			columns={columns}
			pagination={{ pageSize: PAGE_SIZE, variant: 'compact' }}
		/>
	)
}

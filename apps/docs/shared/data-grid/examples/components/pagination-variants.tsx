'use client'

import { defineColumns, PaginationVariant } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from './_data'

const PAGE_SIZE = 10
const ROW_TOTAL = 50

const columns = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
])

export function PaginationVariantNumberedExample() {
	const data = useMemo(() => makeUsers(ROW_TOTAL), [])
	const table = useDataGrid({
		data,
		columns,
		pagination: { pageSize: PAGE_SIZE, variant: PaginationVariant.Numbered },
	})
	return <DataGrid table={table} />
}

export function PaginationVariantSimpleExample() {
	const data = useMemo(() => makeUsers(ROW_TOTAL), [])
	const table = useDataGrid({
		data,
		columns,
		pagination: { pageSize: PAGE_SIZE, variant: PaginationVariant.Simple },
	})
	return <DataGrid table={table} />
}

export function PaginationVariantCompactExample() {
	const data = useMemo(() => makeUsers(ROW_TOTAL), [])
	const table = useDataGrid({
		data,
		columns,
		pagination: { pageSize: PAGE_SIZE, variant: PaginationVariant.Compact },
	})
	return <DataGrid table={table} />
}

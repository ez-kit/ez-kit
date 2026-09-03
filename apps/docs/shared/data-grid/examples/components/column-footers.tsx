'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers, PRODUCT_DATA } from './_data'

import type { Product, User } from './_data'

const productColumnsWithTotals = createColumns<Product>([
	{ accessorKey: 'name', header: 'Product', footer: 'Total' },
	{ accessorKey: 'category', header: 'Category' },
	{
		accessorKey: 'stock',
		header: 'Stock',
		align: 'end',
		cell: { type: 'number' },
		footerClassName: 'font-medium',
		// The live table, so the total follows the filter instead of contradicting it.
		footer: ({ table }) => table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.stock, 0),
	},
])

export function ColumnFootersExample() {
	return (
		<DataGrid
			data={PRODUCT_DATA}
			columns={productColumnsWithTotals}
			filtering
		/>
	)
}

const userColumnsWithTotals = createColumns<User>([
	{ accessorKey: 'name', header: 'Name', footer: 'Average age' },
	{ accessorKey: 'email', header: 'Email' },
	{
		accessorKey: 'age',
		header: 'Age',
		align: 'end',
		cell: { type: 'number' },
		footer: ({ table }) => {
			const rows = table.getFilteredRowModel().rows
			if (rows.length === 0) return '—'
			return Math.round(rows.reduce((sum, row) => sum + row.original.age, 0) / rows.length)
		},
	},
])

export function StickyFooterExample() {
	const data = useMemo(() => makeUsers(50), [])

	return (
		<DataGrid
			data={data}
			columns={userColumnsWithTotals}
			layout={{ stickyHeader: true, stickyFooter: true, maxHeight: '20rem' }}
		/>
	)
}

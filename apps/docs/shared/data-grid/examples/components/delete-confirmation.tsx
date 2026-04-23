'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { PRODUCT_DATA, type Product } from './_data'

const columns = defineColumns<Product>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'category', header: 'Category' },
	{ accessorKey: 'status', header: 'Status' },
	{ accessorKey: 'stock', header: 'Stock' },
])

export function DeleteConfirmationExample() {
	const [data, setData] = useState(PRODUCT_DATA)

	const table = useDataGrid({
		data,
		columns,
		sorting: true,
		pagination: { pageSize: 10 },
		deleting: {
			onDelete: (row) => {
				setData((prev) => prev.filter((item) => item.id !== row.original.id))
			},
			confirmation: {
				title: 'Delete product?',
				description: (row) =>
					`Are you sure you want to delete "${(row.original as Product).name}"? This action cannot be undone.`,
			},
		},
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Click Delete on any row — a confirmation dialog will appear before the row is removed.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

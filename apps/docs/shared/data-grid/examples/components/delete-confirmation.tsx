'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { PRODUCT_DATA, type Product } from './_data'

const columns = createColumns<Product>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'category', header: 'Category' },
	{ accessorKey: 'status', header: 'Status' },
	{ accessorKey: 'stock', header: 'Stock' },
])

export function DeleteConfirmationExample() {
	const [data, setData] = useState(PRODUCT_DATA)

	return (
		<DataGrid
			data={data}
			columns={columns}
			sorting
			selection
			pagination={{ pageSize: 10 }}
			deleting={{
				onDelete: ({ row }) => {
					setData((prev) => prev.filter((item) => item.id !== row.original.id))
				},
				confirmation: {
					title: 'Delete product?',
					description: (row) => `Are you sure you want to delete "${row.original.name}"? This action cannot be undone.`,
				},
				bulk: {
					onDelete: ({ rowIds }) => {
						const removed = new Set(rowIds.map(Number))
						setData((prev) => prev.filter((item) => !removed.has(item.id)))
					},
					confirmation: {
						title: 'Delete products?',
						description: (rows) => `${String(rows.length)} products will be permanently removed.`,
					},
				},
			}}
		/>
	)
}

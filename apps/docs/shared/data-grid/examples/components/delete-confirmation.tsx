'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createPaginatedRowModel,
	createSortedRowModel,
	deletingFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { PRODUCT_DATA, type Product } from './_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	deletingFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	sortFns,
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

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
			features={features}
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

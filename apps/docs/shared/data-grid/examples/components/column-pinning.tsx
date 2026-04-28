'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { PRODUCT_DATA, type Product } from './_data'

const colPinColumns = defineColumns<Product>([
	{ accessorKey: 'name', header: 'Name', size: 180, pinning: { defaultPin: 'left' } },
	{
		accessorKey: 'status',
		header: 'Status',
		size: 120,
		cell: {
			type: 'badge',
			config: {
				items: [
					{ value: 'active', label: 'Active', variant: 'default' },
					{ value: 'inactive', label: 'Inactive', variant: 'secondary' },
					{ value: 'discontinued', label: 'Discontinued', variant: 'destructive' },
				],
			},
		},
	},
	{ accessorKey: 'category', header: 'Category', size: 140 },
	{
		accessorKey: 'image',
		header: 'Image',
		size: 80,
		cell: { type: 'image', config: { width: 40, height: 40, alt: 'Product' } },
	},
	{ accessorKey: 'website', header: 'Website', size: 220, cell: { type: 'link' } },
	{
		accessorKey: 'stock',
		header: 'Stock %',
		size: 120,
		cell: { type: 'progress', config: { max: 100 } },
		pinning: { defaultPin: 'right' },
	},
])

export function ColumnPinningExample() {
	const [data] = useState(PRODUCT_DATA)

	const table = useDataGrid({
		data,
		columns: colPinColumns,
		sorting: true,
		pinning: { column: true },
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Click ⋮ next to a column header to pin left / right or unpin. Scroll horizontally to see pin shadows.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { PRODUCT_DATA, type Product } from './_data'

const colPinColumns = createColumns<Product>([
	{ accessorKey: 'name', header: 'Name', size: 250, pinning: { initialPin: 'left' } },
	{
		accessorKey: 'status',
		header: 'Status',
		size: 120,
		pinning: { initialPin: 'left' },
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
	{ accessorKey: 'category', header: 'Category', size: 200 },
	{
		accessorKey: 'image',
		header: 'Image',
		size: 80,
		cell: { type: 'image', config: { width: 40, height: 40, alt: 'Product' } },
	},
	{ accessorKey: 'website', header: 'Website', size: 140, cell: { type: 'link' }, pinning: { initialPin: 'right' } },
	{
		accessorKey: 'stock',
		header: 'Stock %',
		size: 180,
		cell: { type: 'progress', config: { max: 100 } },
		pinning: { initialPin: 'right' },
	},
])

export function ColumnPinningExample() {
	const [data] = useState(PRODUCT_DATA)

	return (
		<DataGrid
			data={data}
			columns={colPinColumns}
			sorting
			pinning={{ column: true }}
		/>
	)
}

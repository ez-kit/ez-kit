'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { PRODUCT_DATA, type Product } from './_data'

const colPinColumns = createColumns<Product>([
	{ accessorKey: 'name', header: 'Name', width: 250, pinning: { initialSide: 'left' } },
	{
		accessorKey: 'status',
		header: 'Status',
		width: 120,
		pinning: { initialSide: 'left' },
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
	{ accessorKey: 'category', header: 'Category', width: 200 },
	{
		accessorKey: 'image',
		header: 'Image',
		width: 80,
		cell: { type: 'image', config: { width: 40, height: 40, alt: 'Product' } },
	},
	{ accessorKey: 'website', header: 'Website', width: 140, cell: { type: 'link' }, pinning: { initialSide: 'right' } },
	{
		accessorKey: 'stock',
		header: 'Stock %',
		width: 180,
		cell: { type: 'progress', config: { max: 100 } },
		pinning: { initialSide: 'right' },
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

'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { PRODUCT_DATA, type Product } from '../_data'

const staticPinColumns = createColumns<Product>([
	{ accessorKey: 'name', header: 'Name', width: 220, pinning: 'left' },
	{ accessorKey: 'category', header: 'Category', width: 220 },
	{ accessorKey: 'status', header: 'Status', width: 200 },
	{ accessorKey: 'website', header: 'Website', width: 220, cell: { type: 'link' } },
	{ accessorKey: 'stock', header: 'Stock %', width: 220, cell: { type: 'progress', config: { max: 100 } } },
])

export function ColumnPinningStaticExample() {
	const [data] = useState(PRODUCT_DATA)

	return (
		<DataGrid
			data={data}
			columns={staticPinColumns}
			sorting
			pinning={{ column: true }}
		/>
	)
}

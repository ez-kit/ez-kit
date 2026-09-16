'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	editingFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { CustomDataGrid } from 'shared/data-grid/CustomGrid'

import type { CustomCellTypes } from 'shared/data-grid/custom-cell-types'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	editingFeature,
	sortFns,
	sortedRowModel: createSortedRowModel(),
})

type LineItem = {
	id: number
	product: string
	category: string
	price: number
}

const LINE_ITEM_DATA: LineItem[] = [
	{ id: 1, product: 'Pro subscription', category: 'SaaS', price: 149.0 },
	{ id: 2, product: 'Onboarding call', category: 'Services', price: 500 },
	{ id: 3, product: 'Extra seats (5)', category: 'SaaS', price: 74.95 },
	{ id: 4, product: 'Priority support', category: 'Add-on', price: 29.99 },
	{ id: 5, product: 'Data export', category: 'Add-on', price: 0 },
]

const lineItemColumns = createColumns<LineItem, CustomCellTypes>([
	{ accessorKey: 'product', header: 'Product' },
	{ accessorKey: 'category', header: 'Category' },
	{ accessorKey: 'price', header: 'Price', cell: { type: 'currency' } },
])

export function CustomCellCurrencyExample() {
	const [data, setData] = useState(LINE_ITEM_DATA)

	return (
		<CustomDataGrid
			features={features}
			data={data}
			columns={lineItemColumns}
			sorting
			editing={{
				mode: 'row',
				onSave: ({ rowId, values }) => {
					setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
				},
			}}
		/>
	)
}

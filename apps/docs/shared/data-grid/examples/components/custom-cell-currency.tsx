'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { CustomDataGrid, useDataGrid } from 'shared/data-grid/CustomGrid'

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

const lineItemColumns = defineColumns<LineItem>([
	{ accessorKey: 'product', header: 'Product' },
	{ accessorKey: 'category', header: 'Category' },
	{ accessorKey: 'price', header: 'Price', cell: { type: 'currency' } },
])

export function CustomCellCurrencyExample() {
	const [data, setData] = useState(LINE_ITEM_DATA)

	const table = useDataGrid({
		data,
		columns: lineItemColumns,
		sorting: true,
		editing: {
			mode: 'row',
			onSave: ({ rowId, values }) => {
				setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
			},
		},
	})

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				A custom <code>currency</code> cell type — the view formats the raw number with{' '}
				<code>Intl.NumberFormat</code>, the editor is a plain number input. Click Edit to change a price.
			</p>
			<CustomDataGrid table={table} />
		</div>
	)
}

'use client'

import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	filterFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import type { ColumnFiltersState, FilterFieldDef, StructuredFilterValue } from '@ez-kit/data-grid-react'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnFilteringFeature,
	filterFns,
	filteredRowModel: createFilteredRowModel(),
})

type Order = {
	id: number
	customer: string
	status: 'open' | 'shipped' | 'delivered'
	warehouse: 'msk' | 'spb' | 'kzn'
}

const ORDERS: Order[] = [
	{ id: 1001, customer: 'Acme Inc.', status: 'open', warehouse: 'msk' },
	{ id: 1002, customer: 'Globex Corp.', status: 'shipped', warehouse: 'spb' },
	{ id: 1003, customer: 'Initech', status: 'delivered', warehouse: 'kzn' },
	{ id: 1004, customer: 'Umbrella Co.', status: 'open', warehouse: 'spb' },
	{ id: 1005, customer: 'Stark Industries', status: 'shipped', warehouse: 'msk' },
	{ id: 1006, customer: 'Wayne Enterprises', status: 'delivered', warehouse: 'msk' },
]

const STATUS_ITEMS = [
	{ value: 'open', label: 'Open' },
	{ value: 'shipped', label: 'Shipped' },
	{ value: 'delivered', label: 'Delivered' },
]

const WAREHOUSE_ITEMS = [
	{ value: 'msk', label: 'Moscow' },
	{ value: 'spb', label: 'Saint Petersburg' },
	{ value: 'kzn', label: 'Kazan' },
]

const COLUMNS = createColumns<Order>([
	{ accessorKey: 'id', header: 'Order', filtering: false },
	{ accessorKey: 'customer', header: 'Customer', filtering: { operators: true } },
	{
		accessorKey: 'status',
		header: 'Status',
		cell: { type: 'select', config: { items: STATUS_ITEMS } },
		filtering: { operators: true },
	},
])

const FIELDS: FilterFieldDef[] = [
	{
		id: 'warehouse',
		header: 'Warehouse',
		cell: { type: 'select', config: { items: WAREHOUSE_ITEMS } },
		filtering: { operators: true },
	},
]

function matches(order: Order, id: string, filter: StructuredFilterValue): boolean {
	const cell = String(order[id as keyof Order])
	const { operator, value } = filter
	if (value === undefined || (Array.isArray(value) && value.length === 0)) return true
	if (operator === 'in') return (value as string[]).includes(cell)
	if (operator === 'notIn') return !(value as string[]).includes(cell)
	if (operator === 'contains') return cell.toLowerCase().includes(String(value).toLowerCase())
	return cell === String(value)
}

function queryOrders(filters: ColumnFiltersState): Order[] {
	return ORDERS.filter((order) =>
		filters.every((entry) => matches(order, entry.id, entry.value as StructuredFilterValue)),
	)
}

export function FilterFieldsExample() {
	const [query, setQuery] = useState<ColumnFiltersState>([])

	return (
		<div>
			<DataGrid
				features={features}
				data={queryOrders(query)}
				columns={COLUMNS}
				filtering={{ manual: true, onChange: setQuery, fields: FIELDS }}
			>
				<DataGrid.Toolbar start={<DataGrid.FilterPanel />} />
				<DataGrid.ActiveFiltersBar />
				<DataGrid.Table />
			</DataGrid>
			<pre
				data-testid='filter-fields-query'
				style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}
			>
				{JSON.stringify(query)}
			</pre>
		</div>
	)
}

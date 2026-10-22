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
import { useEffect, useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import type { FilterItem, ItemsSourceResult } from '@ez-kit/data-grid-react'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnFilteringFeature,
	filterFns,
	filteredRowModel: createFilteredRowModel(),
})

type Shipment = {
	id: number
	reference: string
	warehouse: { id: string; name: string }
}

const SHIPMENTS: Shipment[] = [
	{ id: 1, reference: 'SHP-1042', warehouse: { id: 'wh_12', name: 'Berlin' } },
	{ id: 2, reference: 'SHP-1043', warehouse: { id: 'wh_7', name: 'Bern' } },
	{ id: 3, reference: 'SHP-1044', warehouse: { id: 'wh_12', name: 'Berlin' } },
	{ id: 4, reference: 'SHP-1045', warehouse: { id: 'wh_31', name: 'Lyon' } },
	{ id: 5, reference: 'SHP-1046', warehouse: { id: 'wh_7', name: 'Bern' } },
	{ id: 6, reference: 'SHP-1047', warehouse: { id: 'wh_3', name: 'Old Depot' } },
]

const WAREHOUSES: FilterItem[] = [
	{ value: 'wh_12', label: 'Berlin HQ', count: 2 },
	{ value: 'wh_7', label: 'Bern', count: 2 },
	{ value: 'wh_31', label: 'Lyon', count: 1 },
	{ value: 'wh_3', label: 'Old Depot', count: 1 },
]

const RESPONSE_DELAY_MS = 1200

function useWarehouses(): ItemsSourceResult<FilterItem> {
	const [items, setItems] = useState<FilterItem[] | undefined>(undefined)

	useEffect(() => {
		const timer = setTimeout(() => {
			setItems(WAREHOUSES)
		}, RESPONSE_DELAY_MS)
		return () => {
			clearTimeout(timer)
		}
	}, [])

	return { items: items ?? [], isLoading: items === undefined }
}

const columns = createColumns<Shipment>([
	{ accessorKey: 'reference', header: 'Reference' },
	{
		id: 'warehouse',
		header: 'Warehouse',
		accessorFn: (row) => row.warehouse.id,
		cell: { type: 'select', config: { useItems: useWarehouses } },
		filtering: { operators: true, defaultOperator: 'in' },
	},
])

const columnsWithRowLabels = createColumns<Shipment>([
	{ accessorKey: 'reference', header: 'Reference' },
	{
		id: 'warehouse',
		header: 'Warehouse',
		accessorFn: (row) => row.warehouse.id,
		cell: {
			type: 'select',
			config: {
				useItems: useWarehouses,
				getItem: (row) => ({ value: row.warehouse.id, label: row.warehouse.name }),
			},
		},
		filtering: { operators: true, defaultOperator: 'in' },
	},
])

export function AsyncItemsExample() {
	return (
		<DataGrid
			features={features}
			data={SHIPMENTS}
			columns={columns}
			filtering
		/>
	)
}

export function AsyncItemsGetItemExample() {
	return (
		<DataGrid
			features={features}
			data={SHIPMENTS}
			columns={columnsWithRowLabels}
			filtering
		/>
	)
}

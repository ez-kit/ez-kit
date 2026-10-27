'use client'

import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	editingFeature,
	filterFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { CustomDataGrid } from 'shared/data-grid/CustomGrid'

import type { BadgeItem } from '@ez-kit/data-grid-react'
import type { CustomCellTypes } from 'shared/data-grid/custom-cell-types'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnFilteringFeature,
	editingFeature,
	filterFns,
	filteredRowModel: createFilteredRowModel(),
})

type Ticket = {
	id: number
	title: string
	status: string
	priority: string
}

const TICKET_DATA: Ticket[] = [
	{ id: 1, title: 'Checkout fails on Safari', status: 'open', priority: 'high' },
	{ id: 2, title: 'Update onboarding copy', status: 'review', priority: 'low' },
	{ id: 3, title: 'Rotate API keys', status: 'done', priority: 'medium' },
	{ id: 4, title: 'Slow search on large projects', status: 'open', priority: 'medium' },
	{ id: 5, title: 'Broken link in footer', status: 'done', priority: 'low' },
]

const STATUS_ITEMS: BadgeItem[] = [
	{ value: 'open', label: 'Open', variant: 'default' },
	{ value: 'review', label: 'In review', variant: 'outline' },
	{ value: 'done', label: 'Done', variant: 'secondary' },
]

const PRIORITY_ITEMS: BadgeItem[] = [
	{ value: 'high', label: 'High', variant: 'destructive' },
	{ value: 'medium', label: 'Medium', variant: 'outline' },
	{ value: 'low', label: 'Low', variant: 'secondary' },
]

const ticketColumns = createColumns<Ticket, CustomCellTypes>([
	{ accessorKey: 'title', header: 'Title' },
	{ accessorKey: 'status', header: 'Status', cell: { type: 'badge', config: { items: STATUS_ITEMS, size: 'md' } } },
	{
		accessorKey: 'priority',
		header: 'Priority',
		cell: { type: 'badge', config: { items: PRIORITY_ITEMS, size: 'sm' } },
	},
])

export function CustomCellBadgeSizeExample() {
	const [data, setData] = useState(TICKET_DATA)

	return (
		<CustomDataGrid
			features={features}
			data={data}
			columns={ticketColumns}
			filtering
			editing={{
				mode: 'row',
				onSave: ({ rowId, values }) => {
					setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
				},
			}}
		/>
	)
}

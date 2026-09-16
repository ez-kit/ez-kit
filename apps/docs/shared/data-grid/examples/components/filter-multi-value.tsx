'use client'

import {
	columnFacetingFeature,
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	filterFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnFacetingFeature,
	columnFilteringFeature,
	filterFns,
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	filteredRowModel: createFilteredRowModel(),
})

type Ticket = {
	id: number
	title: string
	status: 'open' | 'in_progress' | 'done' | 'cancelled'
	priority: 'low' | 'medium' | 'high'
}

const DATA: Ticket[] = [
	{ id: 1, title: 'Indexing job hangs on large datasets', status: 'open', priority: 'high' },
	{ id: 2, title: 'Add dark theme toggle', status: 'in_progress', priority: 'medium' },
	{ id: 3, title: 'Fix 500 on /metrics', status: 'done', priority: 'high' },
	{ id: 4, title: 'Tighten Stripe webhook auth', status: 'open', priority: 'high' },
	{ id: 5, title: 'Rewrite onboarding tour', status: 'in_progress', priority: 'low' },
	{ id: 6, title: 'Drop unused legacy endpoints', status: 'cancelled', priority: 'low' },
	{ id: 7, title: 'Email digest opt-out flag', status: 'done', priority: 'medium' },
	{ id: 8, title: 'Add quick filters to /tickets', status: 'open', priority: 'medium' },
	{ id: 9, title: 'Run lighthouse on every PR', status: 'in_progress', priority: 'low' },
	{ id: 10, title: 'Replace usage chart library', status: 'done', priority: 'medium' },
]

const STATUS_ITEMS = [
	{ value: 'open', label: 'Open' },
	{ value: 'in_progress', label: 'In progress' },
	{ value: 'done', label: 'Done' },
	{ value: 'cancelled', label: 'Cancelled' },
]

const PRIORITY_ITEMS = [
	{ value: 'low', label: 'Low' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'high', label: 'High' },
]

const baseColumns = createColumns<Ticket>([
	{ accessorKey: 'title', header: 'Title' },
	{
		accessorKey: 'status',
		header: 'Status',
		cell: { type: 'select', config: { items: STATUS_ITEMS } },
		filtering: { operators: true },
	},
	{
		accessorKey: 'priority',
		header: 'Priority',
		cell: { type: 'badge', config: { items: PRIORITY_ITEMS } },
		filtering: { operators: true },
	},
])

const notInColumns = createColumns<Ticket>([
	{ accessorKey: 'title', header: 'Title' },
	{
		accessorKey: 'status',
		header: 'Status',
		cell: { type: 'select', config: { items: STATUS_ITEMS } },
		filtering: { operators: true, defaultOperator: 'notIn' },
	},
])

export function FilterMultiValueInExample() {
	return (
		<DataGrid
			features={features}
			data={DATA}
			columns={baseColumns}
			filtering
		/>
	)
}

export function FilterMultiValueFacetedExample() {
	return (
		<DataGrid
			features={features}
			data={DATA}
			columns={baseColumns}
			filtering={{ faceted: true }}
		/>
	)
}

export function FilterMultiValueNotInExample() {
	return (
		<DataGrid
			features={features}
			data={DATA}
			columns={notInColumns}
			filtering
		/>
	)
}

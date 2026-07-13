'use client'

import { defineColumns } from '@ez-kit/data-grid-react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

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

const baseColumns = defineColumns<Ticket>([
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

const notInColumns = defineColumns<Ticket>([
	{ accessorKey: 'title', header: 'Title' },
	{
		accessorKey: 'status',
		header: 'Status',
		cell: { type: 'select', config: { items: STATUS_ITEMS } },
		filtering: { operators: true, defaultOperator: 'notIn' },
	},
])

export function FilterMultiValueInExample() {
	const table = useDataGrid({ data: DATA, columns: baseColumns, filtering: true })
	return <DataGrid table={table} />
}

export function FilterMultiValueFacetedExample() {
	const table = useDataGrid({
		data: DATA,
		columns: baseColumns,
		filtering: { faceted: true },
	})
	return <DataGrid table={table} />
}

export function FilterMultiValueNotInExample() {
	const table = useDataGrid({ data: DATA, columns: notInColumns, filtering: true })
	return <DataGrid table={table} />
}

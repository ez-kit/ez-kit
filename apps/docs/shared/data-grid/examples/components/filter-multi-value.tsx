'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

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

function InDefaultsDemo() {
	const table = useDataGrid({ data: DATA, columns: baseColumns, filtering: true })
	return <DataGrid table={table} />
}

function FacetedCountsDemo() {
	const table = useDataGrid({
		data: DATA,
		columns: baseColumns,
		filtering: { faceted: true },
	})
	return <DataGrid table={table} />
}

function NotInDemo() {
	const table = useDataGrid({ data: DATA, columns: notInColumns, filtering: true })
	return <DataGrid table={table} />
}

const SUB_TABS = [
	{ id: 'in', label: 'In (default)', Component: InDefaultsDemo },
	{ id: 'faceted', label: 'Faceted counts', Component: FacetedCountsDemo },
	{ id: 'not-in', label: 'Not in', Component: NotInDemo },
] as const

type SubTabId = (typeof SUB_TABS)[number]['id']

export function FilterMultiValueExample() {
	const [active, setActive] = useState<SubTabId>('in')
	const tab = SUB_TABS.find((t) => t.id === active) ?? SUB_TABS[0]

	return (
		<div>
			<div
				style={{
					display: 'flex',
					gap: '0.25rem',
					flexWrap: 'wrap',
					borderBottom: '1px solid #e2e8f0',
					marginBottom: '1.5rem',
				}}
			>
				{SUB_TABS.map((t) => (
					<button
						key={t.id}
						onClick={() => {
							setActive(t.id)
						}}
						style={{
							padding: '0.375rem 0.75rem',
							border: 'none',
							borderBottom: active === t.id ? '2px solid #0f172a' : '2px solid transparent',
							background: 'none',
							cursor: 'pointer',
							fontSize: '0.875rem',
							fontWeight: active === t.id ? 600 : 400,
							color: active === t.id ? '#0f172a' : '#64748b',
							marginBottom: '-1px',
						}}
					>
						{t.label}
					</button>
				))}
			</div>

			<tab.Component />
		</div>
	)
}

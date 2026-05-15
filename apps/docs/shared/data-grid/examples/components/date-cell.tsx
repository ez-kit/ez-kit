'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

type Milestone = {
	id: number
	title: string
	dueDate: string
	completedAt: string | undefined
}

const INITIAL_DATA: Milestone[] = [
	{ id: 1, title: 'Design review', dueDate: '2026-01-15', completedAt: '2026-01-12' },
	{ id: 2, title: 'API contract freeze', dueDate: '2026-02-01', completedAt: undefined },
	{ id: 3, title: 'Beta rollout', dueDate: '2026-03-10', completedAt: undefined },
	{ id: 4, title: 'Security audit', dueDate: '2025-11-20', completedAt: '2025-12-04' },
	{ id: 5, title: 'GA release', dueDate: '2026-05-01', completedAt: undefined },
	{ id: 6, title: 'Retrospective', dueDate: '2026-05-15', completedAt: undefined },
]

const baseColumns = defineColumns<Milestone>([
	{ accessorKey: 'title', header: 'Title' },
	{
		accessorKey: 'dueDate',
		header: 'Due date',
		cell: {
			type: 'date',
			config: { format: { dateStyle: 'medium' }, minValue: '2025-01-01', maxValue: '2027-12-31' },
		},
		filtering: { operators: true },
	},
	{
		accessorKey: 'completedAt',
		header: 'Completed at',
		cell: {
			type: 'date',
			config: { format: { dateStyle: 'short' } },
		},
		filtering: {
			operators: {
				items: ['eq', 'before', 'after', 'between'],
				betweenOperator: { variant: 'inputs' },
			},
		},
	},
])

function ViewOnlyDemo() {
	const table = useDataGrid({ data: INITIAL_DATA, columns: baseColumns, filtering: true })
	return <DataGrid table={table} />
}

function InlineEditDemo() {
	const [rows, setRows] = useState<Milestone[]>(INITIAL_DATA)
	const table = useDataGrid({
		data: rows,
		columns: baseColumns,
		getRowId: (row) => String(row.id),
		filtering: true,
		editing: {
			mode: 'cell',
			onSave: ({ rowId, values }) => {
				setRows((prev) => prev.map((row) => (String(row.id) === rowId ? { ...row, ...values } : row)))
			},
		},
	})
	return (
		<div>
			<p style={{ marginBottom: '0.75rem', color: '#64748b', fontSize: '0.875rem' }}>
				Double-click a date cell to open the picker. Both columns round-trip ISO 8601 strings.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

function CreatingDemo() {
	const [rows, setRows] = useState<Milestone[]>(INITIAL_DATA)
	const table = useDataGrid({
		data: rows,
		columns: baseColumns,
		getRowId: (row) => String(row.id),
		creating: {
			mode: 'row',
			onSave: ({ values }) => {
				const next = values as Partial<Omit<Milestone, 'id'>>
				setRows((prev) => [
					...prev,
					{
						id: prev.length + 1,
						title: next.title ?? '',
						dueDate: next.dueDate ?? '',
						completedAt: next.completedAt,
					},
				])
			},
		},
	})
	return (
		<div>
			<p style={{ marginBottom: '0.75rem', color: '#64748b', fontSize: '0.875rem' }}>
				The inline create row reuses the same DatePicker for the `creating` slot — `minValue` / `maxValue` from
				`DateCellConfig` clamp the calendar.
			</p>
			<DataGrid table={table} />
		</div>
	)
}

const SUB_TABS = [
	{ id: 'view', label: 'View + formatting', Component: ViewOnlyDemo },
	{ id: 'edit', label: 'Inline edit', Component: InlineEditDemo },
	{ id: 'create', label: 'Creating', Component: CreatingDemo },
] as const

type SubTabId = (typeof SUB_TABS)[number]['id']

export function DateCellExample() {
	const [active, setActive] = useState<SubTabId>('view')
	const tab = SUB_TABS.find((t) => t.id === active) ?? SUB_TABS[0]

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
				Demonstrates the `date` cell type end-to-end — view formatting via{' '}
				<code style={{ background: '#f1f5f9', padding: '0 0.25rem', borderRadius: 4 }}>Intl.DateTimeFormat</code>{' '}
				options, inline cell editing, inline row creating, and per-column filter operators (including a
				date-aware `between`).
			</p>

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

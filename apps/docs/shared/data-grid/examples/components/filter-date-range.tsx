'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import type { DateRangePreset } from '@ez-kit/data-grid-react'

type Release = {
	id: number
	title: string
	releasedAt: string
}

const DATA: Release[] = [
	{ id: 1, title: 'v1.0.0 — initial release', releasedAt: '2025-11-04' },
	{ id: 2, title: 'v1.1.0 — column pinning', releasedAt: '2025-12-18' },
	{ id: 3, title: 'v1.2.0 — global filtering', releasedAt: '2026-02-09' },
	{ id: 4, title: 'v1.3.0 — between slider', releasedAt: '2026-03-21' },
	{ id: 5, title: 'v1.4.0 — multi-value filters', releasedAt: '2026-04-12' },
	{ id: 6, title: 'v1.5.0 — date range presets', releasedAt: '2026-05-14' },
]

const presetsBuiltInColumns = defineColumns<Release>([
	{ accessorKey: 'title', header: 'Title' },
	{
		accessorKey: 'releasedAt',
		header: 'Released',
		cell: { type: 'date' },
		filtering: {
			operators: {
				items: ['eq', 'before', 'after', 'between'],
				betweenOperator: { variant: 'inputs', presets: true },
			},
			defaultOperator: 'between',
		},
	},
])

const calendarColumns = defineColumns<Release>([
	{ accessorKey: 'title', header: 'Title' },
	{
		accessorKey: 'releasedAt',
		header: 'Released',
		cell: { type: 'date' },
		filtering: {
			operators: {
				items: ['between'],
				betweenOperator: { variant: 'calendar', presets: true },
			},
			defaultOperator: 'between',
		},
	},
])

const customPresets: DateRangePreset[] = [
	{
		id: 'q1-2026',
		label: 'Q1 2026',
		getRange: () => ({ from: '2026-01-01', to: '2026-03-31' }),
	},
	{
		id: 'q2-2026',
		label: 'Q2 2026',
		getRange: () => ({ from: '2026-04-01', to: '2026-06-30' }),
	},
	{
		id: 'all-2025',
		label: 'All of 2025',
		getRange: () => ({ from: '2025-01-01', to: '2025-12-31' }),
	},
]

const customPresetsColumns = defineColumns<Release>([
	{ accessorKey: 'title', header: 'Title' },
	{
		accessorKey: 'releasedAt',
		header: 'Released',
		cell: { type: 'date' },
		filtering: {
			operators: {
				items: ['between'],
				betweenOperator: { variant: 'inputs', presets: customPresets },
			},
			defaultOperator: 'between',
		},
	},
])

function BuiltInPresetsDemo() {
	const table = useDataGrid({ data: DATA, columns: presetsBuiltInColumns, filtering: true })
	return <DataGrid table={table} />
}

function CalendarRangeDemo() {
	const table = useDataGrid({ data: DATA, columns: calendarColumns, filtering: true })
	return <DataGrid table={table} />
}

function CustomPresetsDemo() {
	const table = useDataGrid({ data: DATA, columns: customPresetsColumns, filtering: true })
	return <DataGrid table={table} />
}

const SUB_TABS = [
	{ id: 'built-in', label: 'Built-in presets', Component: BuiltInPresetsDemo },
	{ id: 'calendar', label: 'Range calendar', Component: CalendarRangeDemo },
	{ id: 'custom', label: 'Custom presets', Component: CustomPresetsDemo },
] as const

type SubTabId = (typeof SUB_TABS)[number]['id']

export function FilterDateRangeExample() {
	const [active, setActive] = useState<SubTabId>('built-in')
	const tab = SUB_TABS.find((t) => t.id === active) ?? SUB_TABS[0]

	return (
		<div>
			<p style={{ marginBottom: '1rem', color: '#666' }}>
				Date range filters: built-in presets (Today, Yesterday, Last 7/30 days, This/Last month), a true range
				calendar via <code>variant: &apos;calendar&apos;</code>, and custom presets — quarterly ranges, year-long windows, or
				anything else that fits your domain.
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

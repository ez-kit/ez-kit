'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useMemo, useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from './_data'

const columns = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

function AutoMountDemo() {
	const data = useMemo(() => makeUsers(50), [])
	const table = useDataGrid({
		data,
		columns,
		filtering: { chips: true, clearButton: true },
		globalFiltering: { placeholder: 'Search…' },
		pagination: { pageSize: 10 },
	})
	return <DataGrid table={table} />
}

function AlwaysShowDemo() {
	const data = useMemo(() => makeUsers(50), [])
	const table = useDataGrid({
		data,
		columns,
		filtering: { chips: true, clearButton: { alwaysShow: true } },
		globalFiltering: true,
		pagination: { pageSize: 10 },
	})
	return <DataGrid table={table} />
}

function CustomLayoutDemo() {
	const data = useMemo(() => makeUsers(50), [])
	const table = useDataGrid({
		data,
		columns,
		filtering: true,
		globalFiltering: true,
		pagination: { pageSize: 10 },
	})
	return (
		<DataGrid table={table}>
			<DataGrid.Toolbar>
				<DataGrid.GlobalFilterInput />
				<DataGrid.ClearFiltersButton>Reset</DataGrid.ClearFiltersButton>
			</DataGrid.Toolbar>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '0.5rem',
					padding: '0.5rem 0',
					flexWrap: 'wrap',
				}}
			>
				<span style={{ color: '#64748b', fontSize: '0.875rem' }}>Active:</span>
				<DataGrid.ActiveFiltersBar />
			</div>
			<DataGrid.Table />
			<DataGrid.Pagination />
		</DataGrid>
	)
}

const SUB_TABS = [
	{ id: 'auto', label: 'Auto-mount', Component: AutoMountDemo },
	{ id: 'always', label: 'Always show clear', Component: AlwaysShowDemo },
	{ id: 'custom', label: 'Custom layout', Component: CustomLayoutDemo },
] as const

type SubTabId = (typeof SUB_TABS)[number]['id']

export function FilterChipsExample() {
	const [active, setActive] = useState<SubTabId>('auto')
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

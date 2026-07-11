'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useMemo, useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from './_data'

const columnsWithSecret = defineColumns<User & { internalId: string }>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'internalId', header: 'Internal ID', globalFilter: false },
])

const baseColumns = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

function makeUsersWithSecret(count: number) {
	return makeUsers(count).map((u) => ({ ...u, internalId: `INT-${String(u.id).padStart(5, '0')}` }))
}

function BasicDemo() {
	const data = useMemo(() => makeUsers(50), [])
	const table = useDataGrid({
		data,
		columns: baseColumns,
		globalFiltering: true,
		pagination: { pageSize: 10 },
	})
	return <DataGrid table={table} />
}

function CombinedDemo() {
	const data = useMemo(() => makeUsers(50), [])
	const table = useDataGrid({
		data,
		columns: baseColumns,
		filtering: true,
		globalFiltering: { placeholder: 'Search users…' },
		pagination: { pageSize: 10 },
	})
	return <DataGrid table={table} />
}

function ExcludedColumnDemo() {
	const data = useMemo(() => makeUsersWithSecret(50), [])
	const table = useDataGrid({
		data,
		columns: columnsWithSecret,
		globalFiltering: { placeholder: 'Try searching for INT-00001…' },
		pagination: { pageSize: 10 },
	})
	return <DataGrid table={table} />
}

function CustomFnDemo() {
	const data = useMemo(() => makeUsers(50), [])
	const table = useDataGrid({
		data,
		columns: baseColumns,
		globalFiltering: {
			placeholder: 'Starts-with search…',
			debounce: 0,
			fn: (row, columnId, value) => {
				const cell = String(row.getValue(columnId) ?? '').toLowerCase()
				return cell.startsWith(String(value).toLowerCase())
			},
		},
		pagination: { pageSize: 10 },
	})
	return <DataGrid table={table} />
}

const SUB_TABS = [
	{ id: 'basic', label: 'Basic', Component: BasicDemo },
	{ id: 'combined', label: 'With column filters', Component: CombinedDemo },
	{ id: 'excluded', label: 'Exclude a column', Component: ExcludedColumnDemo },
	{ id: 'custom-fn', label: 'Custom filter fn', Component: CustomFnDemo },
] as const

type SubTabId = (typeof SUB_TABS)[number]['id']

export function GlobalFilteringExample() {
	const [active, setActive] = useState<SubTabId>('basic')
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

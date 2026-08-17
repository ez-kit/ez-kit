'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from './_data'

const columnsWithSecret = createColumns<User & { internalId: string }>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'internalId', header: 'Internal ID', globalFilter: false },
])

const baseColumns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

function makeUsersWithSecret(count: number) {
	return makeUsers(count).map((u) => ({ ...u, internalId: `INT-${String(u.id).padStart(5, '0')}` }))
}

export function GlobalFilteringBasicExample() {
	const data = useMemo(() => makeUsers(50), [])
	return (
		<DataGrid
			data={data}
			columns={baseColumns}
			globalFiltering
			pagination={{ pageSize: 10 }}
		/>
	)
}

export function GlobalFilteringCombinedExample() {
	const data = useMemo(() => makeUsers(50), [])
	return (
		<DataGrid
			data={data}
			columns={baseColumns}
			filtering
			globalFiltering={{ placeholder: 'Search users…' }}
			pagination={{ pageSize: 10 }}
		/>
	)
}

export function GlobalFilteringExcludedExample() {
	const data = useMemo(() => makeUsersWithSecret(50), [])
	return (
		<DataGrid
			data={data}
			columns={columnsWithSecret}
			globalFiltering={{ placeholder: 'Try searching for INT-00001…' }}
			pagination={{ pageSize: 10 }}
		/>
	)
}

export function GlobalFilteringCustomFnExample() {
	const data = useMemo(() => makeUsers(50), [])
	return (
		<DataGrid
			data={data}
			columns={baseColumns}
			globalFiltering={{
				placeholder: 'Starts-with search…',
				debounce: 0,
				fn: (row, columnId, value) => {
					const cell = String(row.getValue(columnId) ?? '').toLowerCase()
					return cell.startsWith(String(value).toLowerCase())
				},
			}}
			pagination={{ pageSize: 10 }}
		/>
	)
}

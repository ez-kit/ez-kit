'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from './_data'

const columns = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

export function FilterChipsAutoExample() {
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

export function FilterChipsAlwaysExample() {
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

export function FilterChipsCustomExample() {
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

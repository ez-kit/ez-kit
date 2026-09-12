'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from './_data'

// The popover variant is what makes this feature worth its space: the filter controls sit behind
// header icons, so the chips strip is the only place the applied filters are readable. Under the
// inline variant every chip would just repeat the input right below it.
const columns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' }, filtering: { operators: true } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

export function FilterChipsAutoExample() {
	const data = useMemo(() => makeUsers(50), [])
	return (
		<DataGrid
			data={data}
			columns={columns}
			filtering={{ variant: 'popover', chips: true, toolbar: true }}
			globalFiltering
			pagination={{ pageSize: 10 }}
		/>
	)
}

export function FilterChipsOnlyExample() {
	const data = useMemo(() => makeUsers(50), [])
	return (
		<DataGrid
			data={data}
			columns={columns}
			filtering={{ variant: 'popover', chips: true }}
			pagination={{ pageSize: 10 }}
		/>
	)
}

// `chips: 'below'` — the scalar *is* the position. Same grid as the auto-mount example above,
// so the only visible difference is which side of the table the strip lands on.
export function FilterChipsBelowExample() {
	const data = useMemo(() => makeUsers(50), [])
	return (
		<DataGrid
			data={data}
			columns={columns}
			filtering={{ variant: 'popover', chips: 'below', toolbar: true }}
			globalFiltering
			pagination={{ pageSize: 10 }}
		/>
	)
}

export function FilterChipsAlwaysExample() {
	const data = useMemo(() => makeUsers(50), [])
	return (
		<DataGrid
			data={data}
			columns={columns}
			filtering={{ variant: 'popover', chips: true, toolbar: { alwaysShow: true } }}
			globalFiltering
			pagination={{ pageSize: 10 }}
		/>
	)
}

export function FilterChipsCustomExample() {
	const data = useMemo(() => makeUsers(50), [])
	return (
		<DataGrid
			data={data}
			columns={columns}
			filtering={{ variant: 'popover' }}
			globalFiltering
			pagination={{ pageSize: 10 }}
		>
			<DataGrid.Toolbar>
				<DataGrid.GlobalFilterInput />
				<DataGrid.ClearFiltersButton>Reset</DataGrid.ClearFiltersButton>
			</DataGrid.Toolbar>
			<DataGrid.ActiveFiltersBar />
			<DataGrid.Table />
			<DataGrid.Pagination />
		</DataGrid>
	)
}

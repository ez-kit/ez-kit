'use client'

import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFns,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { ruMessages } from '@ez-kit/data-grid-core/messages/ru'
import { DataGridOptionsProvider, createColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers } from './_data'

import type { User } from './_data'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	columnFilteringFeature,
	filterFns,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	sortFns,
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

const columns = createColumns<User>([
	{ accessorKey: 'name', header: 'Имя', filtering: { operators: true } },
	{ accessorKey: 'email', header: 'Почта' },
	{ accessorKey: 'age', header: 'Возраст', align: 'end', cell: { type: 'number' }, filtering: { operators: true } },
	{ accessorKey: 'active', header: 'Активен', cell: { type: 'boolean' }, filtering: { operators: true } },
])

function UsersGrid() {
	const data = useMemo(() => makeUsers(24), [])

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			messages={{ grid: { label: 'Пользователи' }, fallbacks: { empty: 'Пользователей нет' } }}
			selection
			filtering
			globalFiltering
			visibility
			pagination={{ pageSize: 5 }}
		/>
	)
}

export function LocalizationExample() {
	return (
		<DataGridOptionsProvider<typeof features, User> defaults={{ messages: ruMessages }}>
			<UsersGrid />
		</DataGridOptionsProvider>
	)
}

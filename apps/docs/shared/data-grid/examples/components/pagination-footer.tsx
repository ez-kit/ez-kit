'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createPaginatedRowModel,
	rowPaginationFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from './_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel(),
})

const PAGE_SIZE = 10
const ROW_TOTAL = 50
// Enough pages that the link strip has to window (1 … 4 5 6 … 100) rather than list them all.
const WINDOWED_ROW_TOTAL = 1000

const columns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
])

export function PaginationLinksExample() {
	const data = useMemo(() => makeUsers(WINDOWED_ROW_TOTAL), [])
	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			pagination={{ pageSize: PAGE_SIZE, links: true }}
		/>
	)
}

export function PaginationLinksOffExample() {
	const data = useMemo(() => makeUsers(ROW_TOTAL), [])
	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			pagination={{ pageSize: PAGE_SIZE, links: false }}
		/>
	)
}

export function PaginationEdgesExample() {
	const data = useMemo(() => makeUsers(ROW_TOTAL), [])
	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			pagination={{ pageSize: PAGE_SIZE, links: false, edges: true, label: 'page' }}
		/>
	)
}

export function PaginationPageSizerFooterExample() {
	const data = useMemo(() => makeUsers(ROW_TOTAL), [])
	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			pagination={{ pageSize: PAGE_SIZE, links: false, edges: true, label: 'page', pageSizer: 'footer' }}
		/>
	)
}

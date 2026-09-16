'use client'

import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	creatingFeature,
	deletingFeature,
	editingFeature,
	filterFns,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers, type User } from '../_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	creatingFeature,
	columnFilteringFeature,
	deletingFeature,
	editingFeature,
	filterFns,
	rowPaginationFeature,
	rowSelectionFeature,
	sortFns,
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

export function BaseFullExample() {
	const [data, setData] = useState(() => makeUsers(1000))

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			sorting
			filtering
			pagination={{ pageSize: 10, items: [10, 25, 50, 100] }}
			visibility
			selection
			editing={{
				mode: 'row',
				onSave: ({ rowId, values }) => {
					setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
				},
			}}
			creating={{
				mode: 'pin-row',
				onSave: ({ values }) => {
					setData((prev) => [...prev, values as User])
				},
			}}
			deleting={{
				onDelete: ({ row }) => {
					setData((prev) => prev.filter((r) => r.id !== row.original.id))
				},
				// One word: with no handler of its own, bulk delete loops `onDelete` over the selection.
				bulk: true,
			}}
		/>
	)
}

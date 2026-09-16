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
	tableFeatures,
} from '@ez-kit/data-grid-core/features'

import { DataGrid } from 'shared/DataGrid'

import { crudColumns } from './columns'
import { useEmployeeStore } from './use-employee-store'

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
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

export function CrudClientExample() {
	const { data, add, update, remove, removeMany } = useEmployeeStore()

	return (
		<DataGrid
			features={features}
			data={data}
			columns={crudColumns}
			sorting
			filtering={{ variant: 'popover' }}
			pagination={{ pageSize: 10, items: [5, 10, 20, 50] }}
			visibility
			pinning={{ column: true }}
			selection
			creating={{
				mode: 'row',
				onSave: ({ values }) => {
					add(values)
				},
			}}
			editing={{
				mode: 'row',
				onSave: ({ rowId, values }) => {
					update(Number(rowId), values)
				},
			}}
			deleting={{
				onDelete: ({ row }) => {
					remove(row.original.id)
				},
				confirmation: {
					title: 'Delete employee?',
					description: (row) => `Are you sure you want to delete "${row.original.name}"? This action cannot be undone.`,
				},
				bulk: {
					onDelete: ({ rows }) => {
						removeMany(rows.map((r) => r.original.id))
					},
					confirmation: {
						title: 'Delete employees?',
						description: (rows) => `${String(rows.length)} employees will be permanently removed.`,
					},
				},
			}}
		/>
	)
}

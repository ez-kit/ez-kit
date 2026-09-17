'use client'

import {
	columnFacetingFeature,
	columnFilteringFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	creatingFeature,
	deletingFeature,
	editingFeature,
	filterFns,
	globalFilteringFeature,
	loadingFeature,
	rowPaginationFeature,
	rowPinningFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'

import { DataGrid } from 'shared/DataGrid'

import { orderColumns } from './data'
import { ProductionLayout } from './ProductionLayout'
import { useOrders } from './use-orders'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnResizingFeature,
	rowSortingFeature,
	loadingFeature,
	creatingFeature,
	columnFacetingFeature,
	columnFilteringFeature,
	deletingFeature,
	editingFeature,
	filterFns,
	globalFilteringFeature,
	rowPaginationFeature,
	rowPinningFeature,
	rowSelectionFeature,
	sortFns,
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

export function ProductionExample() {
	const orders = useOrders()

	return (
		<DataGrid
			features={features}
			data={orders.rows}
			columns={orderColumns}
			pagination={{
				manual: true,
				rowCount: orders.rowCount,
				items: [10, 25, 50],
				siblings: 1,
				onChange: ({ pageIndex, pageSize }) => {
					orders.setPageIndex(pageIndex)
					orders.setPageSize(pageSize)
				},
			}}
			sorting={{
				manual: true,
				multi: { max: 3, event: 'ctrl' },
				onChange: (next) => {
					orders.setSorting(next)
					orders.resetToFirstPage()
				},
			}}
			filtering={{
				manual: true,
				faceted: true,
				debounce: 300,
				onChange: (next) => {
					orders.setColumnFilters(next)
					orders.resetToFirstPage()
				},
			}}
			globalFiltering={{
				placeholder: 'Search orders…',
				debounce: 300,
				onChange: (next) => {
					orders.setGlobalFilter(String(next ?? ''))
					orders.resetToFirstPage()
				},
			}}
			layout={{ stickyHeader: true }}
			pinning={{ column: true, row: { top: true, bottom: true } }}
			resizing={{ mode: 'onChange' }}
			visibility
			creating={{
				mode: 'modal',
				onSave: ({ values }) => orders.create(values),
			}}
			editing={{
				mode: 'modal',
				onSave: ({ rowId, values }) => orders.update(Number(rowId), values),
			}}
			deleting={{
				onDelete: ({ row }) => orders.remove([row.original.id]),
				confirmation: {
					title: 'Delete order?',
					description: (row) => `Order ${row.original.reference} will be permanently removed.`,
				},
				bulk: {
					onDelete: ({ rows }) => orders.remove(rows.map((row) => row.original.id)),
					confirmation: { title: 'Delete orders?' },
				},
			}}
			selection
			state={{
				pagination: { pageIndex: orders.pageIndex, pageSize: orders.pageSize },
				sorting: orders.sorting,
				columnFilters: orders.columnFilters,
				globalFilter: orders.globalFilter,
				loading: orders.loading,
			}}
		>
			<ProductionLayout />
		</DataGrid>
	)
}

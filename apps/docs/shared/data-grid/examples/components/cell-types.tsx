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
	editingFeature,
	filterFns,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { PRODUCT_DATA, productColumns, type Product } from './_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	creatingFeature,
	columnFilteringFeature,
	editingFeature,
	filterFns,
	rowPaginationFeature,
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

export function CellTypesExample() {
	const [data, setData] = useState(PRODUCT_DATA)

	return (
		<DataGrid
			features={features}
			data={data}
			columns={productColumns}
			sorting
			filtering
			pagination={{ pageSize: 10 }}
			editing={{
				mode: 'row',
				onSave: ({ rowId, values }) => {
					setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
				},
			}}
			creating={{
				mode: 'pin-row',
				onSave: ({ values }) => {
					setData((prev) => [...prev, values as Product])
				},
			}}
		/>
	)
}

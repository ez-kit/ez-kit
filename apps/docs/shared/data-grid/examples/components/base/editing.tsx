'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createPaginatedRowModel,
	editingFeature,
	rowPaginationFeature,
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
	editingFeature,
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel(),
})

export function BaseEditingExample() {
	const [data, setData] = useState<User[]>(() => makeUsers(50))

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			pagination={{ pageSize: 10, items: [5, 10, 25] }}
			editing={{
				mode: 'row',
				onSave: ({ rowId, values }) => {
					setData((prev) => prev.map((row) => (row.id.toString() === rowId ? { ...row, ...values } : row)))
				},
			}}
		/>
	)
}

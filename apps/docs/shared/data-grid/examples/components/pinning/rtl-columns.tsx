'use client'

import {
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	creatingFeature,
	infiniteFeature,
	loadingFeature,
	rowSortingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { PRODUCT_DATA, type Product } from '../_data'

const features = tableFeatures({
	// The base set the React adapter requires on every grid — see
	// /docs/data-grid/feature-set#the-base-set-every-grid-needs.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnResizingFeature,
	rowSortingFeature,
	loadingFeature,
	creatingFeature,
	infiniteFeature,
	sortedRowModel: createSortedRowModel(),
})

/**
 * `start` and `end` are logical: the pinned edge is the inline-start / inline-end one, so
 * under `direction: 'rtl'` the `start`-pinned column sticks to the **right** of the viewport
 * and the `end`-pinned one to the left. That flip is the whole reason column pinning uses a
 * logical vocabulary while row pinning stays `top` / `bottom`.
 */
const rtlPinColumns = createColumns<Product>([
	{ accessorKey: 'name', header: 'اسم', width: 220, pinning: 'start' },
	{ accessorKey: 'category', header: 'فئة', width: 220 },
	{ accessorKey: 'status', header: 'حالة', width: 220 },
	{ accessorKey: 'website', header: 'موقع', width: 220, cell: { type: 'link' } },
	{ accessorKey: 'stock', header: 'مخزون', width: 220, pinning: 'end', cell: { type: 'number' } },
])

export function ColumnPinningRtlExample() {
	const [data] = useState(PRODUCT_DATA)

	return (
		// The grid option tells the grid which direction it is laid out in — it does not lay the
		// page out. `dir` on an ancestor is what makes the browser resolve `inset-inline-start`
		// and friends the other way round, and it is what an RTL app sets anyway.
		<div dir='rtl'>
			<DataGrid
				features={features}
				data={data}
				columns={rtlPinColumns}
				direction='rtl'
				sorting
				pinning={{ column: true }}
			/>
		</div>
	)
}

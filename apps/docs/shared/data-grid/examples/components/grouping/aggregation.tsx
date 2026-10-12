'use client'

import {
	aggregationFns,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	rowAggregationFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

/**
 * **No grouping at all** — and that is the point of this example.
 *
 * `rowAggregationFeature` totals a column over the filtered rows, so a footer grand total costs
 * neither `columnGroupingFeature` nor `createGroupedRowModel()`. Registering grouping merely to
 * total a column is the mistake upstream's own guidance leads with.
 */
const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowAggregationFeature,
	aggregationFns,
})

type Deal = {
	id: number
	account: string
	region: string
	seats: number
	revenue: number
}

const DEALS: Deal[] = [
	{ id: 1, account: 'Acme', region: 'EMEA', seats: 120, revenue: 50_000 },
	{ id: 2, account: 'Globex', region: 'EMEA', seats: 80, revenue: 38_000 },
	{ id: 3, account: 'Initech', region: 'EMEA', seats: 45, revenue: 22_000 },
	{ id: 4, account: 'Umbrella', region: 'APAC', seats: 210, revenue: 61_000 },
	{ id: 5, account: 'Soylent', region: 'APAC', seats: 30, revenue: 17_000 },
]

const columns = createColumns<Deal>([
	{ accessorKey: 'account', header: 'Account', footer: 'Total' },
	{ accessorKey: 'region', header: 'Region' },
	{
		accessorKey: 'seats',
		header: 'Seats',
		cell: { type: 'number' },
		align: 'end',
		aggregation: 'sum',
	},
	{
		accessorKey: 'revenue',
		header: 'Revenue',
		cell: { type: 'number' },
		align: 'end',
		aggregation: 'sum',
	},
])

export function GroupingAggregationExample() {
	return (
		<DataGrid
			features={features}
			data={DEALS}
			columns={columns}
		>
			<DataGrid.Table>
				<DataGrid.Header />
				<DataGrid.Body />
				{/* Each totalled column renders its grand total here. `account` writes its own
				    `footer` instead, and that wins — the total is only a fallback. */}
				<DataGrid.Footer />
			</DataGrid.Table>
		</DataGrid>
	)
}

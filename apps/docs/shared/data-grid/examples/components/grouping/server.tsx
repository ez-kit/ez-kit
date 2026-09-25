'use client'

import {
	columnGroupingFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createManualGroupedRowModel,
	rowExpandingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'

import { DataGrid } from 'shared/DataGrid'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnGroupingFeature,
	// The server grouped these rows; this model marks them rather than grouping them again.
	groupedRowModel: createManualGroupedRowModel(),
	// A group row is a row with `subRows`, so expansion is what opens it. Same as client grouping.
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
	// Deliberately no `rowAggregationFeature` and no `aggregationFns`: every number here was
	// computed by the server, both the group subtotals and the grand total.
})

type Deal = {
	id: string
	account: string
	region: string
	revenue: number
	subRows?: Deal[]
}

/**
 * A stand-in for a server response: a tree the server already grouped by `region`, plus the
 * grand total the server computed over the whole (unfiltered, unpaginated) result set.
 *
 * Each group row's own `revenue` is the region's subtotal — an ordinary field, not a computed
 * one, which is why the `revenue` column below writes no `aggregation`.
 */
const RESPONSE: { rows: Deal[]; totals: Record<string, unknown> } = {
	rows: [
		{
			id: 'region-emea',
			account: '',
			region: 'EMEA',
			revenue: 110_000,
			subRows: [
				{ id: '1', account: 'Acme', region: 'EMEA', revenue: 50_000 },
				{ id: '2', account: 'Globex', region: 'EMEA', revenue: 38_000 },
				{ id: '3', account: 'Initech', region: 'EMEA', revenue: 22_000 },
			],
		},
		{
			id: 'region-apac',
			account: '',
			region: 'APAC',
			revenue: 78_000,
			subRows: [
				{ id: '4', account: 'Umbrella', region: 'APAC', revenue: 61_000 },
				{ id: '5', account: 'Soylent', region: 'APAC', revenue: 17_000 },
			],
		},
	],
	// The grand total, over every deal the server holds — not only the ones in `rows` above.
	totals: { revenue: 188_000 },
}

const columns = createColumns<Deal>([
	{ accessorKey: 'account', header: 'Account', footer: 'Total' },
	{ accessorKey: 'region', header: 'Region' },
	{
		accessorKey: 'revenue',
		header: 'Revenue',
		cell: { type: 'number' },
		align: 'end',
		// No `aggregation` here: the group subtotal is this column's own field on the group row,
		// and the grand total comes from `aggregation.totals` below — neither needs one.
	},
])

export function ServerGroupingExample() {
	return (
		<DataGrid
			features={features}
			data={RESPONSE.rows}
			columns={columns}
			grouping={{ by: ['region'], getSubRows: (row) => row.subRows ?? [] }}
			aggregation={{ manual: true, totals: RESPONSE.totals }}
		>
			<DataGrid.Table>
				<DataGrid.Header />
				<DataGrid.Body />
				<DataGrid.Footer />
			</DataGrid.Table>
		</DataGrid>
	)
}

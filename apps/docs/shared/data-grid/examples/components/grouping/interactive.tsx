'use client'

import {
	aggregationFns,
	columnGroupingFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createGroupedRowModel,
	rowAggregationFeature,
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
	groupedRowModel: createGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
	rowAggregationFeature,
	aggregationFns,
})

type Deal = {
	id: number
	account: string
	region: string
	manager: string
	closedAt: string
	revenue: number
}

const DEALS: Deal[] = [
	{ id: 1, account: 'Acme', region: 'EMEA', manager: 'Ivanov', closedAt: '2026-01-14', revenue: 50_000 },
	{ id: 2, account: 'Globex', region: 'EMEA', manager: 'Ivanov', closedAt: '2026-01-22', revenue: 38_000 },
	{ id: 3, account: 'Initech', region: 'EMEA', manager: 'Petrova', closedAt: '2026-02-03', revenue: 22_000 },
	{ id: 4, account: 'Umbrella', region: 'APAC', manager: 'Chen', closedAt: '2026-02-11', revenue: 61_000 },
	{ id: 5, account: 'Soylent', region: 'APAC', manager: 'Chen', closedAt: '2026-03-02', revenue: 17_000 },
	{ id: 6, account: 'Hooli', region: 'AMER', manager: 'Silva', closedAt: '2026-03-19', revenue: 44_000 },
]

const columns = createColumns<Deal>([
	{ accessorKey: 'account', header: 'Account', grouping: false },
	{ accessorKey: 'region', header: 'Region' },
	{ accessorKey: 'manager', header: 'Manager' },
	{
		accessorKey: 'closedAt',
		header: 'Closed',
		cell: { type: 'date' },
		// Group by a value derived from the row: one group per month rather than one per day.
		grouping: { getValue: (row) => row.closedAt.slice(0, 7) },
	},
	{
		accessorKey: 'revenue',
		header: 'Revenue',
		cell: { type: 'number' },
		align: 'end',
		aggregation: 'sum',
	},
])

export function GroupingInteractiveExample() {
	return (
		<DataGrid
			features={features}
			data={DEALS}
			columns={columns}
			// No `by`: the grid starts flat and the reader groups it from a column menu.
			grouping
		>
			{/* The bar is mounted by composition, never by an option. It renders nothing until
			    something is grouped. */}
			<DataGrid.Toolbar start={<DataGrid.GroupByBar />} />
			<DataGrid.Table>
				<DataGrid.Header />
				<DataGrid.Body />
			</DataGrid.Table>
		</DataGrid>
	)
}

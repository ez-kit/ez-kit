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
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnGroupingFeature,
	groupedRowModel: createGroupedRowModel(),
	// A group row is a row with `subRows`, so expansion is what opens it. Grouping never works
	// without these two.
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
	// Only because a column below is totalled — grouping itself needs neither.
	rowAggregationFeature,
	aggregationFns,
})

type Deal = {
	id: number
	account: string
	region: string
	manager: string
	revenue: number
}

const DEALS: Deal[] = [
	{ id: 1, account: 'Acme', region: 'EMEA', manager: 'Ivanov', revenue: 50_000 },
	{ id: 2, account: 'Globex', region: 'EMEA', manager: 'Ivanov', revenue: 38_000 },
	{ id: 3, account: 'Initech', region: 'EMEA', manager: 'Petrova', revenue: 22_000 },
	{ id: 4, account: 'Umbrella', region: 'APAC', manager: 'Chen', revenue: 61_000 },
	{ id: 5, account: 'Soylent', region: 'APAC', manager: 'Chen', revenue: 17_000 },
	{ id: 6, account: 'Hooli', region: 'AMER', manager: 'Silva', revenue: 44_000 },
]

const columns = createColumns<Deal>([
	{ accessorKey: 'account', header: 'Account' },
	{ accessorKey: 'region', header: 'Region' },
	{ accessorKey: 'manager', header: 'Manager' },
	{
		accessorKey: 'revenue',
		header: 'Revenue',
		cell: { type: 'number' },
		align: 'end',
		// Renders on each group row as that group's subtotal.
		aggregation: 'sum',
	},
])

export function GroupingBasicExample() {
	return (
		<DataGrid
			features={features}
			data={DEALS}
			columns={columns}
			grouping={{ by: ['region'] }}
		>
			{/* A grouped column leaves the column list, so it has no header cell left to hang a
			    menu on — dropping the level is the bar's job. Without it this grid is grouped
			    for good. */}
			<DataGrid.Toolbar start={<DataGrid.GroupByBar />} />
			<DataGrid.Table>
				<DataGrid.Header />
				<DataGrid.Body />
			</DataGrid.Table>
		</DataGrid>
	)
}

export function GroupingNestedExample() {
	return (
		<DataGrid
			features={features}
			data={DEALS}
			columns={columns}
			// Outermost first. Every level lives in the one `__group__` column, indented.
			grouping={{ by: ['region', 'manager'] }}
		/>
	)
}

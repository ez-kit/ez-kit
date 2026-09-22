'use client'

import {
	columnFacetingFeature,
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	filterFns,
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
	columnFacetingFeature,
	columnFilteringFeature,
	filterFns,
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	filteredRowModel: createFilteredRowModel(),
})

type Order = {
	id: number
	customer: string
	status: 'open' | 'shipped' | 'delivered' | 'cancelled'
	total: number
	placedAt: string
}

const DATA: Order[] = [
	{ id: 1001, customer: 'Acme Inc.', status: 'open', total: 1280, placedAt: '2026-05-12' },
	{ id: 1002, customer: 'Globex Corp.', status: 'shipped', total: 875, placedAt: '2026-05-10' },
	{ id: 1003, customer: 'Initech', status: 'delivered', total: 410, placedAt: '2026-05-08' },
	{ id: 1004, customer: 'Umbrella Co.', status: 'cancelled', total: 220, placedAt: '2026-04-28' },
	{ id: 1005, customer: 'Stark Industries', status: 'open', total: 3120, placedAt: '2026-05-11' },
	{ id: 1006, customer: 'Wayne Enterprises', status: 'shipped', total: 1990, placedAt: '2026-05-09' },
	{ id: 1007, customer: 'Hooli', status: 'delivered', total: 660, placedAt: '2026-04-30' },
	{ id: 1008, customer: 'Pied Piper', status: 'open', total: 145, placedAt: '2026-05-14' },
]

const STATUS_ITEMS = [
	{ value: 'open', label: 'Open' },
	{ value: 'shipped', label: 'Shipped' },
	{ value: 'delivered', label: 'Delivered' },
	{ value: 'cancelled', label: 'Cancelled' },
]

const COLUMNS = createColumns<Order>([
	{
		accessorKey: 'customer',
		header: 'Customer',
		filtering: { operators: true },
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: { type: 'select', config: { items: STATUS_ITEMS } },
		filtering: { operators: true },
	},
	{
		accessorKey: 'total',
		header: 'Total',
		cell: { type: 'number' },
		filtering: {
			operators: {
				items: ['equals', 'between'],
				betweenOperator: { slider: true, min: 0, max: 5000 },
			},
			defaultOperator: 'between',
		},
	},
	{
		accessorKey: 'placedAt',
		header: 'Placed',
		cell: { type: 'date' },
		filtering: {
			operators: {
				items: ['between'],
			},
			defaultOperator: 'between',
		},
	},
])

export function FilterPanelExample() {
	return (
		<DataGrid
			features={features}
			data={DATA}
			columns={COLUMNS}
			filtering={{ faceted: true }}
		>
			{/*
			 * The panel as the *only* filter UI — what `filtering: { variant: 'panel' }` used to
			 * say. Two independent things, which is exactly why that one enum could not express
			 * the pair: mounting `<DataGrid.FilterPanel/>` puts the controls in a panel, and the
			 * header cell below declining to render `filter` is what takes them out of the
			 * headers. Render `filter` as well and the grid has both, each writing to the one
			 * `columnFilters` slice.
			 */}
			<DataGrid.FilterPanel />
			<DataGrid.Table>
				<DataGrid.Header>
					{({ headerGroups }) =>
						headerGroups.map((headerGroup) => (
							<DataGrid.HeaderRow
								key={headerGroup.id}
								headerGroup={headerGroup}
							>
								{({ headers }) =>
									headers.map((header) => (
										<DataGrid.HeaderCell
											key={header.id}
											header={header}
										>
											{({ sortTrigger, menu }) => (
												<DataGrid.HeaderMain>
													{sortTrigger}
													{menu}
												</DataGrid.HeaderMain>
											)}
										</DataGrid.HeaderCell>
									))
								}
							</DataGrid.HeaderRow>
						))
					}
				</DataGrid.Header>
				<DataGrid.Body />
			</DataGrid.Table>
		</DataGrid>
	)
}

/**
 * Filters in the header **and** in a panel — the arrangement no value of the removed
 * `filtering.variant` could express, because that one enum decided two things at once: whether
 * the panel is mounted, and whether the headers keep their controls.
 *
 * They are separate decisions now, so this is the default header cell (which renders `filter`)
 * plus a mounted `<DataGrid.FilterPanel/>`. Both write to the one `columnFilters` slice, so the
 * two controls for a column are two inputs bound to one value: type in either and the other
 * follows.
 */
export function FilterPanelAndHeaderExample() {
	return (
		<DataGrid
			features={features}
			data={DATA}
			columns={COLUMNS}
			filtering={{ faceted: true }}
		>
			<DataGrid.FilterPanel />
			<DataGrid.Table />
		</DataGrid>
	)
}

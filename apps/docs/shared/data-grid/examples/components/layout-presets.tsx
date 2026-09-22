'use client'

import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFns,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import {
	BottomBarLayout,
	createColumns,
	DefaultLayout,
	PopoverFiltersLayout,
	FilterPanelLayout,
} from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from './_data'

/**
 * One feature set, one column set, one page of rows — shared by all four examples on
 * [Layout presets](/docs/data-grid/layout/presets), so that what differs between the previews
 * is the preset and nothing else.
 *
 * Every control a preset can mount needs its feature registered, or reading that feature's API
 * throws on render. So this set is wide on purpose: the presets differ in *where* they put the
 * controls, and comparing them needs a grid that has all of them to put somewhere.
 */
const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	columnFilteringFeature,
	globalFilteringFeature,
	rowPaginationFeature,
	filterFns,
	sortFns,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
})

const columns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

const ROW_TOTAL = 40
const PAGE_SIZE = 8

/**
 * `items` is what gives `<DataGrid.PageSizer />` a list to offer. It matters for
 * {@link LayoutBottomBarExample}, whose bar mounts one; the other three never render a sizer,
 * so it changes nothing there — which is the point of keeping every option identical.
 */
const pagination = { pageSize: PAGE_SIZE, items: [8, 16, 32] }

function useRows(): User[] {
	return useMemo(() => makeUsers(ROW_TOTAL), [])
}

/**
 * What both kits bind to `core.Layout`, written out — so this preview is also what
 * `<DataGrid data columns features />` renders from a kit with no children at all.
 */
export function LayoutDefaultExample() {
	const data = useRows()

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			pagination={pagination}
			sorting
			filtering
			globalFiltering
			visibility
		>
			<DefaultLayout />
		</DataGrid>
	)
}

/**
 * The page-size selector moves out of nowhere and into the bar beside the page controls: the
 * default mounts no sizer at all, and `<DataGrid.BottomBar />` lays its contents out as a row
 * with two ends, which is what a sizer and the pagination sharing one line needs.
 */
export function LayoutBottomBarExample() {
	const data = useRows()

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			pagination={pagination}
			sorting
			filtering
			globalFiltering
			visibility
		>
			<BottomBarLayout />
		</DataGrid>
	)
}

/**
 * Search leading, the filter panel beside it, the controls trailing, the active-filters strip
 * under the toolbar. Note the panel **adds** to the header's own filter controls rather than
 * replacing them — both write one `columnFilters` value, which no value of the removed
 * `filtering.variant` could express.
 */
export function LayoutFilterPanelExample() {
	const data = useRows()

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			pagination={pagination}
			sorting
			filtering
			globalFiltering
			visibility
		>
			<FilterPanelLayout />
		</DataGrid>
	)
}

/**
 * The default with each column's filter behind a popover trigger in its header. The preset is
 * the expansion down to `<DataGrid.HeaderCell>` that choosing the popover costs, written once
 * so a call site names it instead.
 */
export function LayoutPopoverFiltersExample() {
	const data = useRows()

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			pagination={pagination}
			sorting
			filtering
			globalFiltering
			visibility
		>
			<PopoverFiltersLayout />
		</DataGrid>
	)
}

'use client'

import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	filterFns,
	globalFilteringFeature,
	rowPaginationFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from './_data'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnFilteringFeature,
	filterFns,
	globalFilteringFeature,
	rowPaginationFeature,
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
})

// Filters behind a header popover are what make this feature worth its space: the controls are
// hidden until clicked, so the chips strip is the only place the applied filters are readable.
// With the controls inline in the header, every chip would just repeat the input right below it.
const columns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' }, filtering: { operators: true } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

/**
 * The table with each column's filter behind a popover trigger — the one piece
 * `PopoverFiltersLayout` adds over the default, lifted out on its own so the examples below can
 * each wrap it in a different toolbar and chips arrangement.
 *
 * `filterPopover` rather than `filter` is the whole of it: the same control, behind the kit's
 * trigger. Never both — they are one control in two presentations.
 */
function PopoverFilterTable() {
	return (
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
										{({ sortTrigger, filterPopover, menu }) => (
											<DataGrid.HeaderMain>
												{sortTrigger}
												{filterPopover}
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
	)
}

export function FilterChipsAutoExample() {
	const data = useMemo(() => makeUsers(50), [])
	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			filtering
			globalFiltering
			pagination={{ pageSize: 10 }}
		>
			<DataGrid.Toolbar
				start={<DataGrid.GlobalFilterInput />}
				end={<DataGrid.ClearFiltersButton />}
			/>
			<DataGrid.ActiveFiltersBar />
			<PopoverFilterTable />
			<DataGrid.Pagination />
		</DataGrid>
	)
}

// The strip and the Clear-all button are independent: mount one without the other. Here the
// chips carry the whole account of what is filtered, and with no other control asking for the
// toolbar, `<DataGrid.Toolbar>` is simply not written — so no bar renders.
export function FilterChipsOnlyExample() {
	const data = useMemo(() => makeUsers(50), [])
	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			filtering
			pagination={{ pageSize: 10 }}
		>
			<DataGrid.ActiveFiltersBar />
			<PopoverFilterTable />
			<DataGrid.Pagination />
		</DataGrid>
	)
}

// Same grid as the auto-mount example, with the strip written *after* the table instead of
// before it. `position='below'` is not what moves it — document order is. The prop says which
// way the strip's margin points, which is the one thing a stylesheet cannot read off a JSX
// position: both kits rule on `[data-slot='active-filters-bar'][data-chip-position='…']`.
export function FilterChipsBelowExample() {
	const data = useMemo(() => makeUsers(50), [])
	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			filtering
			globalFiltering
			pagination={{ pageSize: 10 }}
		>
			<DataGrid.Toolbar
				start={<DataGrid.GlobalFilterInput />}
				end={<DataGrid.ClearFiltersButton />}
			/>
			<PopoverFilterTable />
			<DataGrid.ActiveFiltersBar position='below' />
			<DataGrid.Pagination />
		</DataGrid>
	)
}

export function FilterChipsAlwaysExample() {
	const data = useMemo(() => makeUsers(50), [])
	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			filtering
			globalFiltering
			pagination={{ pageSize: 10 }}
		>
			<DataGrid.Toolbar
				start={<DataGrid.GlobalFilterInput />}
				end={<DataGrid.ClearFiltersButton alwaysShow />}
			/>
			<DataGrid.ActiveFiltersBar />
			<PopoverFilterTable />
			<DataGrid.Pagination />
		</DataGrid>
	)
}

// Both surfaces placed by hand, with a label of the caller's own on the Clear-all button and
// the search box sharing the toolbar's leading slot with it.
export function FilterChipsCustomExample() {
	const data = useMemo(() => makeUsers(50), [])
	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			filtering
			globalFiltering
			pagination={{ pageSize: 10 }}
		>
			<DataGrid.Toolbar>
				<DataGrid.GlobalFilterInput />
				<DataGrid.ClearFiltersButton>Reset</DataGrid.ClearFiltersButton>
			</DataGrid.Toolbar>
			<DataGrid.ActiveFiltersBar />
			<PopoverFilterTable />
			<DataGrid.Pagination />
		</DataGrid>
	)
}

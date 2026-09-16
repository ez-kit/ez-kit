'use client'

import {
	columnFacetingFeature,
	columnFilteringFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	creatingFeature,
	deletingFeature,
	editingFeature,
	filterFns,
	globalFilteringFeature,
	loadingFeature,
	rowPaginationFeature,
	rowPinningFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { DataGridOptionsProvider } from '@ez-kit/data-grid-react'

import type { Order } from './data'
import type { ReactNode } from 'react'

/**
 * One set for every grid in the console, exported so the grids under this provider share it
 * rather than each restating one.
 *
 * `features` **replaces** across option layers instead of merging — composing a set is a decision
 * about what exists, and a merge cannot express "and not that one". So a grid that writes its own
 * `features` under this provider gets *its* set, not the union, and a set narrower than the options
 * declared below would leave those options configured but unregistered. Sharing this one is what
 * keeps the two in step.
 */
export const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is what this provider's options ask for.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnResizingFeature,
	rowSortingFeature,
	creatingFeature,
	columnFacetingFeature,
	columnFilteringFeature,
	deletingFeature,
	editingFeature,
	filterFns,
	globalFilteringFeature,
	rowPaginationFeature,
	rowPinningFeature,
	rowSelectionFeature,
	loadingFeature,
	sortFns,
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

/**
 * Every look-and-feel decision the orders console makes, declared once.
 *
 * In a real app this component wraps the whole tree (or the section that owns
 * the grids) and every `<DataGrid />` beneath it inherits these options — including
 * the `features` set — deep-merged **under** whatever the grid declares itself, so a
 * single grid can still override one nested field without repeating the rest.
 *
 * What is deliberately absent: `data`, `columns`, `state` and `onStateChange`
 * (excluded from `DataGridDefaultOptions` by type — they are per-instance by
 * definition), `pagination.rowCount`, and the write handlers. Create, edit and
 * delete are described here but not switched on: a grid gets the feature only
 * by supplying `onSave` / `onDelete`, so a read-only grid under this provider
 * stays read-only without opting out of anything.
 */
export function DataGridOptions({ children }: { children: ReactNode }) {
	return (
		<DataGridOptionsProvider<typeof features, Order>
			defaults={{
				// A defaults layer may supply the feature set, and this is the case it exists for: one
				// set for every grid in the console. `features` **replaces** across layers rather than
				// merging, so a grid that deliberately narrows below this one gets the narrow set.
				features,
				pagination: {
					manual: true,
					items: [10, 25, 50],
					siblings: 1,
				},
				sorting: { manual: true, multi: { max: 3, event: 'ctrl' }, toolbar: true },
				filtering: {
					manual: true,
					variant: 'popover',
					faceted: true,
					debounce: 300,
					chips: { position: 'above' },
					toolbar: true,
				},
				globalFiltering: { placeholder: 'Search orders…', debounce: 300 },
				layout: { stickyHeader: true },
				pinning: { column: true, row: { top: true, bottom: true } },
				resizing: { mode: 'onChange' },
				visibility: true,
				creating: { mode: 'modal' },
				editing: { mode: 'modal' },
				deleting: {
					confirmation: {
						title: 'Delete order?',
						description: (row) => `Order ${row.original.reference} will be permanently removed.`,
					},
				},
			}}
		>
			{children}
		</DataGridOptionsProvider>
	)
}

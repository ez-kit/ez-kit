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
	draftFeature,
	editingFeature,
	filterFns,
	globalFilteringFeature,
	infiniteFeature,
	loadingFeature,
	rowPaginationFeature,
	rowPinningFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'

/**
 * The three feature sets the production grids compose, kept here rather than at the top of each
 * example.
 *
 * Every one of them is written out member by member, and none of them is
 * `allDataGridFeatures` — deliberately, and for the reason
 * [Feature set](/docs/data-grid/feature-set#alldatagridfeatures) gives: what a reader copies off a
 * docs page is what lands in their bundle, and the all-in set is 45 288 bytes against 1 035 for a
 * sorting-only one. This page is the closest the docs come to "everything at once", which makes it
 * the most tempting place to reach for the shortcut and the worst place to demonstrate it.
 *
 * What moving them here changes is only where they are read, and nothing about what a reader can
 * see. A set is 20-odd lines of imports plus 20-odd lines of literal, which was over a third of the
 * longest of these files (140 lines, now 88) and the first thing in its source tab — while the
 * page's own prose says to copy the wiring rather than the feature list. The source panel follows
 * relative imports, so this file is still a tab beside `data.ts` and `server.ts`; what changed is
 * that the entry tab now opens on the grid.
 *
 * Note this is the one thing `example-features.test.ts` has to follow rather than read in place: it
 * compares the members of a `tableFeatures({ … })` literal against the config keys the same file
 * writes, so for these five files it resolves the import first (`borrowedSet`). The check is
 * unchanged — the set is still matched against the grid that uses it, which is the question that
 * matters.
 */

/**
 * The orders console: server-side query, both write flows, and the whole column toolkit.
 *
 * Named at four sites on the Production page: three grids — two that pass it directly and one
 * under `<DataGridOptions>` — plus that provider's own defaults layer. One set rather than four
 * because `features` **replaces** across option layers rather than merging, so a grid that restated
 * a narrower one under that provider would leave the provider's options configured but
 * unregistered, which is a defect the browser suite has caught before.
 */
export const consoleFeatures = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is what these grids' options ask for.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnResizingFeature,
	rowSortingFeature,
	loadingFeature,
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
	sortFns,
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

/**
 * The deferred-apply console: `draftFeature` in place of the two write flows.
 *
 * Narrower than {@link consoleFeatures} on purpose — no creating, editing, resizing or row
 * pinning — because that grid is about holding a query back until it is applied, and a set that
 * registered the rest would put controls in the bar that the page never talks about.
 */
export const deferredApplyFeatures = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is what this grid's options ask for.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	loadingFeature,
	columnFacetingFeature,
	columnFilteringFeature,
	deletingFeature,
	draftFeature,
	filterFns,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	sortFns,
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

/**
 * The virtualized feed: rows accumulate, so there is no filtering stack and no `paginatedRowModel`.
 *
 * Leaving that row model out is the point rather than an omission. `pagination.mode: 'infinite'`
 * shows every row loaded so far, and `paginatedRowModel` would slice them back to one page; core
 * warns at construction, and a warning inside an iframed docs example is easy to miss.
 */
export const feedFeatures = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is what this grid's options ask for.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	loadingFeature,
	infiniteFeature,
	rowPaginationFeature,
	rowPinningFeature,
	sortFns,
	sortedRowModel: createSortedRowModel(),
})

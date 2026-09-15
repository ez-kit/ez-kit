/**
 * The payload of `@ez-kit/data-grid-core/features` — everything a consumer needs to build a
 * feature set with {@link tableFeatures}, in one import path.
 *
 * Stock TanStack features and row-model factories are re-exported rather than imported by the
 * consumer from `@tanstack/table-core` directly: one import path, the version stays pinned by
 * us, and `table-core` stays our dependency instead of becoming the consumer's peer.
 *
 * The file is named `entry.ts`, **not** `index.ts`: `src/features/` is a directory of feature
 * folders, and a barrel at `src/features/index.ts` would make `import … from '../features'`
 * resolve to everything, so one careless intra-package import would pull every feature into any
 * module. Nothing inside the package imports from here — feature modules keep importing each
 * other by their own paths.
 */

export { tableFeatures, type TableFeatures } from '@tanstack/table-core'

// The 17 stock features. `cellSpanningFeature` is the 17th, new in v9 and absent from upstream's
// own migration table.
export {
	cellSelectionFeature,
	cellSpanningFeature,
	columnFacetingFeature,
	columnFilteringFeature,
	columnGroupingFeature,
	columnOrderingFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	globalFilteringFeature,
	rowAggregationFeature,
	rowExpandingFeature,
	rowPaginationFeature,
	rowPinningFeature,
	rowSelectionFeature,
	rowSortingFeature,
} from '@tanstack/table-core'

// The row-model factories. Each belongs in the feature set beside the feature that consumes it.
export {
	createCoreRowModel,
	createExpandedRowModel,
	createFacetedMinMaxValues,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createGroupedRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
} from '@tanstack/table-core'

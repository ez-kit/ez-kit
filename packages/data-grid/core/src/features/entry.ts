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

import {
	aggregationFns,
	createExpandedRowModel,
	createFacetedMinMaxValues,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createGroupedRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFns,
	sortFns,
	stockFeatures,
	tableFeatures,
} from '@tanstack/table-core'

import { creatingFeature } from './creating'
import { draftFeature } from './deferred-apply'
import { deletingFeature } from './deleting'
import { editingFeature } from './editing'
import { infiniteFeature } from './infinite'
import { loadingFeature } from './loading'
import { rowOrderingFeature } from './ordering'

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

/**
 * The three **named-function registries**. Each is a feature-set slot, not a feature, and each is
 * how v9 resolves a function a column or an option named by *string* rather than supplied inline:
 * `filterFns` for a column's `filterFn` (including the `'auto'` a mapped column carries) and for
 * `globalFilterFn`; `sortFns` for a column's `sorting.fn`; `aggregationFns` for a grouped column's
 * `aggregationFn`.
 *
 * Re-exported because a consumer composing a set has no other way to reach them through this
 * entry point, and leaving one out is silent in the worst way — the name resolves to nothing, the
 * stage runs, and the grid looks like a filter that matches everything or a sort that ignores the
 * comparator it was given. `createTable` warns about the `filterFns` case; the other two it
 * cannot see.
 *
 * All three are marked `@deprecated` upstream in favour of registering the individual
 * `filterFn_*` / `sortFn_*` / `aggregationFn_*` members a table actually uses, for a smaller
 * bundle — and upstream is explicit that they still work and are not going away in v9. They are
 * re-exported anyway, because the alternative is worse for the two cases this entry point serves:
 * {@link allDataGridFeatures} is the all-in set by definition, and a consumer composing a lean one
 * would otherwise have to import ~40 individual names from `@tanstack/table-core` directly —
 * exactly the peer dependency this file exists to spare them. Re-exporting the members
 * individually is the real answer and is a decision for the PR that documents feature composition,
 * not for the one that makes core compile.
 */
// The re-export is what the rule fires on; the reasoning is the docblock directly above.
// eslint-disable-next-line @typescript-eslint/no-deprecated
export { aggregationFns, filterFns, sortFns } from '@tanstack/table-core'

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

// The grid's own features. Each registers itself in `Plugins` and declares its state, options and
// table APIs under its own key in the corresponding `*_FeatureMap`, so a feature left out of a
// table's set contributes neither behaviour nor types.
export { loadingFeature, type LoadingState } from './loading'
export { infiniteFeature, type InfiniteState } from './infinite'
export { rowOrderingFeature, type RowOrderState, type RowOrderingApi } from './ordering'
export {
	editingFeature,
	EditingMode,
	type EditingApi,
	type EditingConfig,
	type EditingSaveContext,
	type EditingState,
} from './editing'
export {
	creatingFeature,
	CreatingMode,
	type CreateDefaultValueContext,
	type CreateDefaultValuesContext,
	type CreatingApi,
	type CreatingConfig,
	type CreatingSaveContext,
	type CreatingState,
} from './creating'
export {
	deletingFeature,
	type BulkConfirmationConfig,
	type BulkDeletingApi,
	type BulkDeletingConfig,
	type BulkDeletingContext,
	type ConfirmationConfig,
	type DeletingApi,
	type DeletingConfig,
	type DeletingContext,
	type DeletingState,
} from './deleting'
// `createDraftAtoms` is not a feature, and it is here because it is what a consumer building the
// table by hand has to call beside `tableFeatures({ draftFeature })` — the two are written in one
// place. It is the only non-feature, non-row-model export on this entry.
export {
	draftFeature,
	createDraftAtoms,
	DraftAxis,
	type AppliedState,
	type DraftApi,
	type DraftAtoms,
	type DraftConfig,
	type PendingCount,
	type QueryDraft,
} from './deferred-apply'

/**
 * Every feature this package ships, stock and custom, in one object.
 *
 * For prototypes, documentation examples and the "just give me a grid" case. Registering it
 * defeats the point of composing a set: nothing tree-shakes, and every registered feature
 * creates its state slice and its APIs whether or not the config enables it (design §1,
 * "Accepted cost"). Name the features you use.
 *
 * `stockFeatures` is upstream's own all-in aggregate, so spreading it stays correct across a
 * table-core patch that adds a feature. The row models are **not** features and are not in it,
 * so each is listed — a set without them registers the features and models no rows through them.
 *
 * Neither are the three named-function registries, and leaving them out was measured rather than
 * assumed. Without `filterFns` a grid built on this set filters **nothing**: `filtering: true` and
 * `globalFiltering: true` both keep every row, because a mapped column's `filterFn` is the name
 * `'auto'` and `globalFilterFn` defaults to `'includesString'`, and an unregistered name resolves
 * to no comparator. Without `sortFns` a column's `sorting: { fn: 'alphanumeric' }` silently sorts
 * by something else — `['item10', 'item2']` instead of `['item2', 'item10']`. Without
 * `aggregationFns` a grouped column's `aggregationFn: 'sum'` aggregates to `undefined`. An all-in
 * set that does none of those three is not the "just give me a grid" set it claims to be, and the
 * `filterFns` case is the very defect `createTable`'s own guard exists to warn about.
 *
 * It deliberately omits `coreReactivityFeature`. `useTable` injects `reactReactivity()` and
 * spreads it **before** the caller's set, so a value supplied here would win and break React
 * rendering (api-notes §5.1); `createTable` supplies `storeReactivityBindings()` the same way for
 * the vanilla path. `entry.test.ts` asserts the key is absent.
 */
export const allDataGridFeatures = tableFeatures({
	...stockFeatures,
	// The aggregate registries, `@deprecated` upstream in favour of the individual `filterFn_*` /
	// `sortFn_*` / `aggregationFn_*` members. That advice is about bundle size, and this is the one
	// set for which it does not apply: it is the all-in set, documented above as defeating tree
	// shaking on purpose. A set composed for a real table should register the members it uses.
	filterFns,
	sortFns,
	aggregationFns,
	sortedRowModel: createSortedRowModel(),
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	expandedRowModel: createExpandedRowModel(),
	groupedRowModel: createGroupedRowModel(),
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	facetedMinMaxValues: createFacetedMinMaxValues(),
	creatingFeature,
	deletingFeature,
	draftFeature,
	editingFeature,
	infiniteFeature,
	loadingFeature,
	rowOrderingFeature,
})

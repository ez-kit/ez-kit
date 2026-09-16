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
 *
 * The all-in set is **not** here. `allDataGridFeatures` lives on its own subpath,
 * `@ez-kit/data-grid-core/features/all` (`src/features/all.ts`), because its declaration is a
 * top-level call whose argument object spreads, which no bundler will drop — so on this entry it
 * anchored every feature the package ships into every import, whichever single name was asked for.
 * See that file's docblock for the measurement.
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
 * re-exported anyway, because the alternative is worse for the two cases the features entry points
 * serve: `allDataGridFeatures` (on `./features/all`) is the all-in set by definition, and a consumer
 * composing a lean one would otherwise have to import ~40 individual names from
 * `@tanstack/table-core` directly — exactly the peer dependency this file exists to spare them.
 * Re-exporting the members individually is the real answer and is a decision for the PR that
 * documents feature composition, not for the one that makes core compile.
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

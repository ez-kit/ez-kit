/**
 * `@ez-kit/data-grid-core/features/all` — the all-in feature set, on an import path of its own.
 *
 * It sits here rather than beside the rest of the payload on `@ez-kit/data-grid-core/features`
 * because of what it costs, and because a bundler cannot spare a consumer that cost on its own.
 * {@link allDataGridFeatures} is a top-level `tableFeatures({ ...stockFeatures, … })` call whose
 * argument object **spreads**, and an object spread may run getters, so esbuild keeps the whole
 * expression — and therefore every feature and every row model named in it — no matter what the
 * importer asked for. A `/* @__PURE__ *\/` annotation does not change that: annotating the call,
 * and each `create*RowModel()` inside it, was measured to cost the bytes of the comments and save
 * nothing.
 *
 * While it sat on `./features`, importing **any** single name from that entry therefore pulled
 * nearly all of it. With the declaration on this subpath instead, a single feature or a
 * sorting-only set costs a rounding error, and the features entry shrank by this set leaving it.
 *
 * Reaching `allDataGridFeatures` through this path still costs what an all-in set costs, and that
 * does not improve and is not meant to: it registers everything by definition, and design §1 calls
 * it an accepted cost. What changed is who pays it — a consumer who writes this import, rather
 * than every consumer who imported anything at all from `./features`.
 *
 * `apps/docs/test/tree-shaking.test.ts` is where this is measured; figures live there rather than
 * in prose, which goes stale.
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

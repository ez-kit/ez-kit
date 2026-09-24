import { constructTable } from '@tanstack/table-core'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'
import { describe, expect, it } from 'vitest'

import { createTable } from '../create-table'

import { allDataGridFeatures } from './all'
import * as features from './entry'

const STOCK = [
	'cellSelectionFeature',
	'cellSpanningFeature',
	'columnFacetingFeature',
	'columnFilteringFeature',
	'columnGroupingFeature',
	'columnOrderingFeature',
	'columnPinningFeature',
	'columnResizingFeature',
	'columnSizingFeature',
	'columnVisibilityFeature',
	'globalFilteringFeature',
	'rowAggregationFeature',
	'rowExpandingFeature',
	'rowPaginationFeature',
	'rowPinningFeature',
	'rowSelectionFeature',
	'rowSortingFeature',
] as const

/** The grid's own features, appended to the entry beside the stock ones. */
const CUSTOM = [
	'loadingFeature',
	'infiniteFeature',
	'rowOrderingFeature',
	'editingFeature',
	'creatingFeature',
	'deletingFeature',
	'draftFeature',
] as const

const ROW_MODEL_FACTORIES = [
	'createCoreRowModel',
	'createExpandedRowModel',
	'createFacetedMinMaxValues',
	'createFacetedRowModel',
	'createFacetedUniqueValues',
	'createFilteredRowModel',
	'createGroupedRowModel',
	'createPaginatedRowModel',
	'createSortedRowModel',
] as const

/** The row-model slots `allDataGridFeatures` fills. Keyed by slot, not by factory name. */
const ROW_MODEL_SLOTS = [
	'sortedRowModel',
	'filteredRowModel',
	'paginatedRowModel',
	'expandedRowModel',
	'groupedRowModel',
	'facetedRowModel',
	'facetedUniqueValues',
	'facetedMinMaxValues',
] as const

describe('@ez-kit/data-grid-core/features', () => {
	it('re-exports all 17 stock features', () => {
		for (const name of STOCK) expect(features[name], name).toBeDefined()
	})

	it("exports the grid's own seven features, and nothing else ending in Feature", () => {
		for (const name of CUSTOM) expect(features[name], name).toBeDefined()
		expect(Object.keys(features).filter((k) => k.endsWith('Feature'))).toHaveLength(STOCK.length + CUSTOM.length)
	})

	it('registers each custom feature under the key `tableFeatures` accepts', () => {
		// The `Plugins` key, the `assignTableAPIs` first argument and the `*_FeatureMap` key are
		// one string. Composing the set is what proves the `Plugins` merge landed.
		const set = features.tableFeatures({
			loadingFeature: features.loadingFeature,
			infiniteFeature: features.infiniteFeature,
			rowOrderingFeature: features.rowOrderingFeature,
			editingFeature: features.editingFeature,
			creatingFeature: features.creatingFeature,
			deletingFeature: features.deletingFeature,
			draftFeature: features.draftFeature,
		})

		for (const name of CUSTOM) expect(set[name], name).toBe(features[name])
	})

	it('re-exports each stock feature as the same object table-core registers it under', async () => {
		const core = await import('@tanstack/table-core')
		for (const name of STOCK) expect(features[name], name).toBe(core.stockFeatures[name])
	})

	it('re-exports the nine row-model factories as callable factories', () => {
		for (const name of ROW_MODEL_FACTORIES) expect(typeof features[name](), name).toBe('function')
		// `createDraftAtoms` shares the `create` prefix without being a row-model factory — it is
		// the atom set a hand-built draft table hands to `createTable` — so it is named here
		// rather than left to widen the count silently.
		expect(
			Object.keys(features)
				.filter((k) => k.startsWith('create'))
				.sort(),
		).toEqual([...ROW_MODEL_FACTORIES, 'createDraftAtoms'].sort())
	})

	it('re-exports tableFeatures, which returns the set it was given', () => {
		const set = features.tableFeatures({ rowSortingFeature: features.rowSortingFeature })
		expect(set.rowSortingFeature).toBe(features.rowSortingFeature)
	})

	it('does not re-export coreReactivityFeature — useTable and createTable each inject their own', () => {
		expect(features).not.toHaveProperty('coreReactivityFeature')
	})
})

// `allDataGridFeatures` ships on its own subpath (`./all`) so that importing anything from the
// features entry does not drag every feature along with it — see `all.ts`. Its cases stay in this
// file anyway: what they assert is that the set registers the very objects the entry re-exports,
// so the two modules have to be read against each other or the assertion says nothing.
describe('allDataGridFeatures', () => {
	it('registers every stock feature and all seven of the grid own ones', () => {
		for (const name of [...STOCK, ...CUSTOM]) expect(allDataGridFeatures[name], name).toBe(features[name])
	})

	it('registers the row models the stock features need, which are not in stockFeatures', () => {
		for (const slot of ROW_MODEL_SLOTS) {
			expect(typeof allDataGridFeatures[slot], slot).toBe('function')
		}
	})

	it('registers the three named-function registries, which are not in stockFeatures either', () => {
		// The behavioural consequence of each is pinned below; this is the structural half.
		// Read through this entry's own re-exports rather than by importing the three aggregates
		// from `@tanstack/table-core`, which are `@deprecated` there (see `entry.ts` for why they
		// are re-exported anyway). That makes the assertion the stronger one: the set registers
		// the very objects a consumer composing their own set would reach for from here, so the
		// two cannot drift apart.
		//
		// The rule follows the `@deprecated` through the re-export, so there is no spelling of this
		// assertion that does not trip it — and the deprecation is precisely what the case is
		// about, so suppressing it here is the accurate thing rather than a dodge.
		/* eslint-disable @typescript-eslint/no-deprecated */
		expect(allDataGridFeatures.filterFns).toBe(features.filterFns)
		expect(allDataGridFeatures.sortFns).toBe(features.sortFns)
		expect(allDataGridFeatures.aggregationFns).toBe(features.aggregationFns)
		/* eslint-enable @typescript-eslint/no-deprecated */
	})

	it('never names coreReactivityFeature — useTable would lose to it', () => {
		// Not `toBeUndefined`: `useTable` spreads `reactReactivity()` *before* the caller's set, so
		// the key being present at all — even as `undefined` — is what would win and break React
		// rendering. `tableFeatures` returns the object it was given, so this reads the real set.
		expect(Object.keys(allDataGridFeatures)).not.toContain('coreReactivityFeature')
	})
})

// The registries are slots rather than features, so nothing about the set's *shape* says whether
// one is missing. Each case below is the behaviour the slot buys, and each was confirmed to fail —
// silently, with no throw and no warning — against a set identical but for that one key.
describe('allDataGridFeatures — what each named-function registry actually buys', () => {
	type Item = { id: number; name: string; group: string; amount: number }
	const ITEMS: Item[] = [
		{ id: 1, name: 'item10', group: 'x', amount: 2 },
		{ id: 2, name: 'item2', group: 'x', amount: 3 },
	]

	it('filters at all — without `filterFns` every row survives a column filter', () => {
		const table = createTable({
			features: allDataGridFeatures,
			data: ITEMS,
			columns: [{ accessorKey: 'name' }],
			filtering: true,
		})

		table.setColumnFilters([{ id: 'name', value: 'item2' }])

		expect(table.getRowModel().rows.map((r) => r.original.name)).toEqual(['item2'])
	})

	it('searches at all — without `filterFns` `globalFilterFn: includesString` resolves to nothing', () => {
		const table = createTable({
			features: allDataGridFeatures,
			data: ITEMS,
			columns: [{ accessorKey: 'name' }],
			globalFiltering: true,
		})

		table.setGlobalFilter('item10')

		expect(table.getRowModel().rows.map((r) => r.original.name)).toEqual(['item10'])
	})

	it('honours a named comparator — without `sortFns` the name falls back to a different sort', () => {
		const table = createTable({
			features: allDataGridFeatures,
			data: ITEMS,
			columns: [{ accessorKey: 'name', sorting: { fn: 'alphanumeric' } }],
			sorting: true,
		})

		table.setSorting([{ id: 'name', desc: false }])

		// The discriminating pair: a plain string sort puts `item10` first, `alphanumeric` does not.
		expect(table.getRowModel().rows.map((r) => r.original.name)).toEqual(['item2', 'item10'])
	})

	// Built through `constructTable` rather than `createTable`, deliberately. Grouping is the one
	// corner of this set the grid's own API cannot reach: `TableConfig` has no `grouping` option
	// and `ColumnDef` no `aggregationFn`, so the only way to exercise the slot is the constructor
	// upstream ships — which is a legitimate consumer of a set built from this entry point, and is
	// how `useTable` reaches it too. Recorded rather than papered over: `columnGroupingFeature` and
	// `rowAggregationFeature` arrive with `stockFeatures` and stay unreachable from `createTable`.
	//
	// The call needs no cast, which is itself the contrast: upstream's own `ColumnDef` *does* carry
	// `aggregationFn` once `rowAggregationFeature` is in the set, so `columns` and `initialState`
	// both type-check against the real options — it is only **our** `ColumnDef` and `TableConfig`
	// that have no key for them.
	it('aggregates a grouped column — without `aggregationFns` the group value is undefined', () => {
		const table = constructTable({
			features: { coreReactivityFeature: storeReactivityBindings(), ...allDataGridFeatures },
			data: ITEMS,
			columns: [{ accessorKey: 'group' }, { accessorKey: 'amount', aggregationFn: 'sum' }],
			initialState: { grouping: ['group'] },
		})

		expect(table.getRowModel().rows[0]?.getValue('amount')).toBe(5)
	})
})

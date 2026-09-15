import { describe, expect, it } from 'vitest'

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

describe('@ez-kit/data-grid-core/features', () => {
	it('re-exports all 17 stock features', () => {
		for (const name of STOCK) expect(features[name], name).toBeDefined()
		expect(Object.keys(features).filter((k) => k.endsWith('Feature'))).toHaveLength(STOCK.length)
	})

	it('re-exports each stock feature as the same object table-core registers it under', async () => {
		const core = await import('@tanstack/table-core')
		for (const name of STOCK) expect(features[name], name).toBe(core.stockFeatures[name])
	})

	it('re-exports the nine row-model factories as callable factories', () => {
		for (const name of ROW_MODEL_FACTORIES) expect(typeof features[name](), name).toBe('function')
		expect(Object.keys(features).filter((k) => k.startsWith('create'))).toHaveLength(ROW_MODEL_FACTORIES.length)
	})

	it('re-exports tableFeatures, which returns the set it was given', () => {
		const set = features.tableFeatures({ rowSortingFeature: features.rowSortingFeature })
		expect(set.rowSortingFeature).toBe(features.rowSortingFeature)
	})

	it('does not re-export coreReactivityFeature — useTable and createTable each inject their own', () => {
		expect(features).not.toHaveProperty('coreReactivityFeature')
	})
})

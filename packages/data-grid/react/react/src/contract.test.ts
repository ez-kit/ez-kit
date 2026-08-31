import { describe, expect, it } from 'vitest'

import { COMPONENT_FEATURE, FEATURE_COMPONENTS, GridFeature } from './contract'

describe('COMPONENT_FEATURE', () => {
	it('maps every injectable component key to a feature (40 total)', () => {
		expect(Object.keys(COMPONENT_FEATURE)).toHaveLength(40)
	})

	it('groups the always-rendered structural primitives under core', () => {
		for (const key of ['Table', 'Thead', 'Tbody', 'Tr', 'Th', 'Td', 'Menu'] as const) {
			expect(COMPONENT_FEATURE[key]).toBe(GridFeature.Core)
		}
	})

	it('is derived from FEATURE_COMPONENTS (flat lookup matches the nested groups)', () => {
		for (const [feature, keys] of Object.entries(FEATURE_COMPONENTS)) {
			for (const key of keys) {
				expect(COMPONENT_FEATURE[key]).toBe(feature)
			}
		}
		const grouped = Object.values(FEATURE_COMPONENTS).reduce((sum, keys) => sum + keys.length, 0)
		expect(grouped).toBe(Object.keys(COMPONENT_FEATURE).length)
	})

	it('assigns feature-specific components to their feature', () => {
		expect(COMPONENT_FEATURE.Pagination).toBe(GridFeature.Pagination)
		expect(COMPONENT_FEATURE.SortMenu).toBe(GridFeature.Sorting)
		expect(COMPONENT_FEATURE.FilterPanel).toBe(GridFeature.Filtering)
		expect(COMPONENT_FEATURE.ConfirmDialog).toBe(GridFeature.Deleting)
		expect(COMPONENT_FEATURE.SelectionBar).toBe(GridFeature.Selection)
		expect(COMPONENT_FEATURE.DraftBar).toBe(GridFeature.Draft)
		expect(COMPONENT_FEATURE.Resizer).toBe(GridFeature.Resizing)
		expect(COMPONENT_FEATURE.LoadMoreRow).toBe(GridFeature.Infinite)
		expect(COMPONENT_FEATURE.Chevron).toBe(GridFeature.Expanding)
	})
})

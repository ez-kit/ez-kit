import { describe, expect, it } from 'vitest'

import { COMPONENT_FEATURE, FEATURE_COMPONENTS, FEATURE_OPTIONAL_COMPONENTS, GridFeature } from './contract'

describe('COMPONENT_FEATURE', () => {
	it('maps every injectable component key to a feature (40 required + 2 optional)', () => {
		expect(Object.keys(COMPONENT_FEATURE)).toHaveLength(42)
	})

	it('groups the always-rendered structural primitives under core', () => {
		for (const key of ['Table', 'Thead', 'Tbody', 'Tr', 'Th', 'Td', 'Menu'] as const) {
			expect(COMPONENT_FEATURE[key]).toBe(GridFeature.Core)
		}
	})

	it('is derived from both group maps (flat lookup matches the nested groups)', () => {
		const maps: Record<string, readonly string[]>[] = [FEATURE_COMPONENTS, FEATURE_OPTIONAL_COMPONENTS]
		for (const map of maps) {
			for (const [feature, keys] of Object.entries(map)) {
				for (const key of keys) {
					expect(COMPONENT_FEATURE[key as keyof typeof COMPONENT_FEATURE]).toBe(feature)
				}
			}
		}
		const countKeys = (map: Record<string, readonly string[]>) =>
			Object.values(map).reduce((sum, keys) => sum + keys.length, 0)
		expect(countKeys(maps[0] ?? {}) + countKeys(maps[1] ?? {})).toBe(Object.keys(COMPONENT_FEATURE).length)
	})

	// The optional tier exists to stay out of `ComponentsFor`, which is what `FullGridComponents`
	// makes required — a key that leaked into both would break every external kit on upgrade.
	it('keeps the optional keys out of the required groups', () => {
		const required = new Set(Object.values(FEATURE_COMPONENTS).flat() as string[])
		for (const key of Object.values(FEATURE_OPTIONAL_COMPONENTS).flat() as string[]) {
			expect(required.has(key), `${key} is listed as both required and optional`).toBe(false)
		}
		expect(FEATURE_OPTIONAL_COMPONENTS[GridFeature.Core]).toEqual(['TableWrapper', 'TableScroll'])
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

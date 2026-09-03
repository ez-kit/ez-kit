import { describe, expect, it } from 'vitest'

import { buildMultiSelectLabel } from './multi-select-label'

const OPTIONS = [
	{ value: 'active', label: 'Active' },
	{ value: 'archived', label: 'Archived' },
]

describe('buildMultiSelectLabel', () => {
	it('shows the placeholder while nothing is selected', () => {
		expect(buildMultiSelectLabel(OPTIONS, [], 'Filter status')).toBe('Filter status')
	})

	it('falls back to a generic placeholder when none is configured', () => {
		expect(buildMultiSelectLabel(OPTIONS, [])).toBe('Select…')
	})

	it("shows the single selection's label", () => {
		expect(buildMultiSelectLabel(OPTIONS, ['archived'])).toBe('Archived')
	})

	it('falls back to the raw value when the option is unknown', () => {
		expect(buildMultiSelectLabel(OPTIONS, ['deleted'])).toBe('deleted')
	})

	it('counts multiple selections', () => {
		expect(buildMultiSelectLabel(OPTIONS, ['active', 'archived'])).toBe('2 selected')
	})
})

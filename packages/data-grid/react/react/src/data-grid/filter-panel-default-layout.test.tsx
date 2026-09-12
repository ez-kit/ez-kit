import { createColumns } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { renderGrid } from '../test-utils'

import type { TestRow } from '../test-utils'

/**
 * `filtering.variant: 'panel'` used to be the one variant that did nothing on its own: it took
 * every filter control out of the header (`header-cell.tsx` skips them under this variant) and
 * the default layout mounted no panel, so the option that asked for the panel left the grid with
 * no filter UI at all — silently. The other two variants render from the same option, and the
 * feature's other surfaces (the chips strip, the Clear-all button) already auto-mount from their
 * own config, so this one does too. Same defect, and same fix, as `column.footer`.
 */
const COLUMNS = createColumns<TestRow>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
])

describe("filtering.variant: 'panel' in the default layout", () => {
	it('mounts the panel, with one chip per filterable column', () => {
		const { container } = renderGrid({ columns: COLUMNS, filtering: { variant: 'panel' } })
		expect(container.querySelector('[data-slot="filter-panel-chrome"]')).not.toBeNull()
		expect(container.querySelectorAll('[data-slot="filter-panel-chip"]')).toHaveLength(COLUMNS.length)
	})

	it('leaves the header free of filter controls, so the panel is the only filter UI', () => {
		const { container } = renderGrid({ columns: COLUMNS, filtering: { variant: 'panel' } })
		expect(container.querySelectorAll('thead [data-slot="filter"]')).toHaveLength(0)
	})

	it('mounts no panel under the other variants', () => {
		for (const variant of ['inline', 'popover'] as const) {
			const { container } = renderGrid({ columns: COLUMNS, filtering: { variant } })
			expect(container.querySelector('[data-slot="filter-panel-chrome"]')).toBeNull()
		}
	})

	it('mounts no panel when filtering is off, even if a defaults layer named the variant', () => {
		const { container } = renderGrid({ columns: COLUMNS, filtering: { variant: 'panel', enabled: false } })
		expect(container.querySelector('[data-slot="filter-panel-chrome"]')).toBeNull()
	})

	// The chips strip is redundant beside a panel that already shows every value, but an author
	// who switched it on asked for it: an option that resolves to nothing is worse than a visible
	// duplicate they can remove. (The strip itself only appears once a filter is active — that is
	// its own documented behaviour, not something the panel changes.)
	it('still renders the chips strip when it was asked for', () => {
		const { container } = renderGrid({
			columns: COLUMNS,
			filtering: { variant: 'panel', chips: true },
			initialState: { columnFilters: [{ id: 'name', value: 'a' }] },
		})
		expect(container.querySelector('[data-slot="filter-panel-chrome"]')).not.toBeNull()
		expect(container.querySelector('[data-slot="active-filters-bar"]')).not.toBeNull()
	})
})

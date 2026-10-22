import { describe, expect, it } from 'vitest'

import { ReorderMode } from './types'

import type { OrderingConfig, SortingConfig } from './types'

describe('ReorderMode', () => {
	it('names the three affordances by behaviour', () => {
		expect(Object.values(ReorderMode)).toEqual(['drag', 'step', 'both'])
	})

	it('is accepted as a bare string by every surface option', () => {
		const ordering: OrderingConfig = {
			column: { header: 'step', visibilityMenu: 'both' },
		}
		const sorting: SortingConfig = { multi: { reorderable: 'drag' } }

		expect(ordering.column).toEqual({ header: 'step', visibilityMenu: 'both' })
		expect(sorting.multi).toEqual({ reorderable: 'drag' })
	})

	it('accepts a boolean on every surface option', () => {
		const ordering: OrderingConfig = { column: { header: false, visibilityMenu: true } }
		const sorting: SortingConfig = { multi: { reorderable: false } }

		expect(ordering.column).toEqual({ header: false, visibilityMenu: true })
		expect(sorting.multi).toEqual({ reorderable: false })
	})

	it('rejects the removed drag / moveControls flags', () => {
		// @ts-expect-error — `drag` was replaced by `header`
		const header: OrderingConfig = { column: { drag: false } }
		// @ts-expect-error — `moveControls` was replaced by `header`
		const menu: OrderingConfig = { column: { moveControls: true } }
		// @ts-expect-error — the panel takes `boolean | ReorderMode`, not the old object form
		const panel: OrderingConfig = { column: { visibilityMenu: { drag: false } } }

		expect([header, menu, panel]).toHaveLength(3)
	})
})

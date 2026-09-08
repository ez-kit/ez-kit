import { describe, expect, it } from 'vitest'

import { getActionsColumnSize, RowActionsPlacement } from './row-actions'

const INLINE = {
	placement: RowActionsPlacement.Inline,
	editing: false,
	deleting: false,
	pinning: false,
	creating: false,
	custom: false,
}

describe('getActionsColumnSize', () => {
	it('reserves the overflow trigger once custom actions are supplied', () => {
		const withoutCustom = getActionsColumnSize({ ...INLINE, deleting: true })
		const withCustom = getActionsColumnSize({ ...INLINE, deleting: true, custom: true })

		expect(withCustom).toBeGreaterThan(withoutCustom)
	})

	it('does not widen twice when pin actions already own that trigger', () => {
		const pinOnly = getActionsColumnSize({ ...INLINE, deleting: true, pinning: true })
		const pinAndCustom = getActionsColumnSize({ ...INLINE, deleting: true, pinning: true, custom: true })

		expect(pinAndCustom).toBe(pinOnly)
	})

	it('reserves the inline form pair for a creating-only grid', () => {
		const creatingOnly = getActionsColumnSize({ ...INLINE, creating: true })
		const editingOnly = getActionsColumnSize({ ...INLINE, editing: true })

		expect(creatingOnly).toBe(editingOnly)
	})

	it('keeps the menu placement at one trigger whatever it holds', () => {
		const bare = getActionsColumnSize({ ...INLINE, placement: RowActionsPlacement.Menu })
		const loaded = getActionsColumnSize({
			placement: RowActionsPlacement.Menu,
			editing: false,
			deleting: true,
			pinning: true,
			creating: false,
			custom: true,
		})

		expect(loaded).toBe(bare)
	})
})

import { describe, expect, it } from 'vitest'

import { getActionsColumnSize, RowActionsVariant } from './row-actions'

const INLINE = { variant: RowActionsVariant.Inline, editing: false, deleting: false, pinning: false, custom: false }

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

	it('keeps the menu variant at one trigger whatever it holds', () => {
		const bare = getActionsColumnSize({ ...INLINE, variant: RowActionsVariant.Menu })
		const loaded = getActionsColumnSize({
			variant: RowActionsVariant.Menu,
			editing: false,
			deleting: true,
			pinning: true,
			custom: true,
		})

		expect(loaded).toBe(bare)
	})
})

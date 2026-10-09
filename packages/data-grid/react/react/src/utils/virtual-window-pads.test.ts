import { describe, expect, it } from 'vitest'

import { resolveVirtualWindowPads } from './virtual-window-pads'

describe('resolveVirtualWindowPads', () => {
	it('offsets the window by its first row and reserves the rest below', () => {
		expect(resolveVirtualWindowPads({ start: 490, end: 980 }, 49_000)).toEqual({
			before: 490,
			after: 48_020,
		})
	})

	it('reserves nothing below a window that reaches the end of the list', () => {
		expect(resolveVirtualWindowPads({ start: 48_510, end: 49_000 }, 49_000)).toEqual({
			before: 48_510,
			after: 0,
		})
	})

	it('pads nothing for an empty window, so the tbody can still reserve the total size', () => {
		expect(resolveVirtualWindowPads(undefined, 49_000)).toEqual({ before: 0, after: 0 })
	})

	it('clamps a window whose end overshoots the total size rather than reporting a negative pad', () => {
		expect(resolveVirtualWindowPads({ start: 0, end: 50_000 }, 49_000)).toEqual({
			before: 0,
			after: 0,
		})
	})
})

import { describe, expect, it } from 'vitest'

import { resolveReorderMode, wantsDrag } from './reorder-mode'

import type { AuthoredReorderMode, ReorderAffordances } from './reorder-mode'

const GRIP: ReorderAffordances = { drag: true, moveControls: false }
const STEP: ReorderAffordances = { drag: false, moveControls: true }
const BOTH: ReorderAffordances = { drag: true, moveControls: true }
const NONE: ReorderAffordances = { drag: false, moveControls: false }

describe('resolveReorderMode', () => {
	const table: [AuthoredReorderMode, ReorderAffordances, ReorderAffordances][] = [
		[true, GRIP, STEP],
		['drag', GRIP, STEP],
		['step', STEP, STEP],
		['both', BOTH, STEP],
		[false, NONE, NONE],
	]

	it.each(table)('resolves %s to the documented pair with and without an adapter', (mode, withAdapter, without) => {
		expect(resolveReorderMode(mode, false, true)).toEqual(withAdapter)
		expect(resolveReorderMode(mode, false, false)).toEqual(without)
	})

	it('takes the surface default when the option is not written', () => {
		expect(resolveReorderMode(undefined, true, true)).toEqual(GRIP)
		expect(resolveReorderMode(undefined, true, false)).toEqual(STEP)
		expect(resolveReorderMode(undefined, false, true)).toEqual(NONE)
	})
})

describe('wantsDrag', () => {
	it('is true only for a mode that names the grip', () => {
		expect(
			[true, false, undefined, 'step', 'drag', 'both'].map((mode) => wantsDrag(mode as AuthoredReorderMode)),
		).toEqual([false, false, false, false, true, true])
	})
})

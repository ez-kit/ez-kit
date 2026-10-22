import { describe, expect, it } from 'vitest'

import { isAllowedReorder, moveSortEntry, swapSortEntries } from './sort-entry-order'

const A = { id: 'a', desc: false }
const B = { id: 'b', desc: true }
const C = { id: 'c', desc: false }

describe('moveSortEntry', () => {
	it('lands the source where the target stood, in either direction', () => {
		expect(moveSortEntry([A, B, C], 'a', 'c')).toEqual([B, C, A])
		expect(moveSortEntry([A, B, C], 'c', 'a')).toEqual([C, A, B])
		expect(moveSortEntry([A, B, C], 'a', 'b')).toEqual([B, A, C])
	})

	it('answers null for a self-drop or an id the sort does not hold', () => {
		expect(moveSortEntry([A, B], 'a', 'a')).toBeNull()
		expect(moveSortEntry([A, B], 'a', 'x')).toBeNull()
		expect(moveSortEntry([A, B], 'x', 'a')).toBeNull()
	})
})

describe('swapSortEntries', () => {
	it('exchanges two neighbours and keeps each direction', () => {
		expect(swapSortEntries([A, B], 1, 0)).toEqual([B, A])
	})

	it('leaves the sort as it is for an index past either end', () => {
		expect(swapSortEntries([A, B], 1, 2)).toEqual([A, B])
	})
})

describe('isAllowedReorder', () => {
	const multi = (id: string) => id !== 'a'

	it('refuses pushing a column outside multi-sort below the first place', () => {
		expect(isAllowedReorder([A, B, C], [B, A, C], multi)).toBe(false)
		expect(isAllowedReorder([A, B, C], [A, C, B], multi)).toBe(true)
	})

	it('still rearranges the rest of a sort that arrived out of shape', () => {
		expect(isAllowedReorder([B, A, C], [C, A, B], multi)).toBe(true)
		expect(isAllowedReorder([B, A, C], [A, B, C], multi)).toBe(true)
	})
})

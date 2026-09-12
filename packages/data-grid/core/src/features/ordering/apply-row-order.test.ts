import { describe, expect, it } from 'vitest'

import { applyRowOrder } from './apply-row-order'

type Row = { id: string }

const id = (row: Row): string => row.id
const rows = (...ids: string[]): Row[] => ids.map((value) => ({ id: value }))

describe('applyRowOrder', () => {
	it('returns the data unchanged for an empty order', () => {
		// Arrange
		const data = rows('a', 'b', 'c')

		// Act + Assert
		expect(applyRowOrder(data, [], id)).toEqual(data)
	})

	it('reorders the data to match the order', () => {
		expect(applyRowOrder(rows('a', 'b', 'c'), ['c', 'a', 'b'], id).map(id)).toEqual(['c', 'a', 'b'])
	})

	it('keeps a row absent from the order at its declared position', () => {
		// 'x' arrived after the order was recorded. It stays third, where the data put it —
		// a new row appearing at the bottom of a list the user arranged is indistinguishable
		// from the reorder having gone wrong.
		expect(applyRowOrder(rows('a', 'b', 'x', 'c'), ['c', 'b', 'a'], id).map(id)).toEqual(['c', 'b', 'x', 'a'])
	})

	it('ignores an order naming a row the data no longer has', () => {
		expect(applyRowOrder(rows('a', 'b'), ['b', 'gone', 'a'], id).map(id)).toEqual(['b', 'a'])
	})

	it('does not mutate its input', () => {
		const data = rows('a', 'b')

		applyRowOrder(data, ['b', 'a'], id)

		expect(data.map(id)).toEqual(['a', 'b'])
	})
})

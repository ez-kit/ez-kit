import { describe, expect, it } from 'vitest'

import { getRowDropIndex, getRowDropOrder } from './row-drop-order'

import type { DataTable, GridFeatures } from '../types'
import type { Row } from '@tanstack/table-core'

/** The three pinned bands a table resolves when `enableRowPinning` is on. */
type MockBands = { top: string[]; center: string[]; bottom: string[] }

/** Only `id` is read by any of the three helpers, so only `id` is modelled. */
const asRow = (id: string) => ({ id }) as unknown as Row<GridFeatures, object>

/**
 * A table modelled on the two shapes `getRowDropOrder` branches between.
 *
 * `bands` left out means `enableRowPinning` is off and the derivation is the row model. Supplied, it
 * means pinning is on and the derivation is the three bands concatenated — and the fixture
 * deliberately lets the bands name rows the row model does not contain, because that is the real
 * case the concatenation exists for: with `keepPinnedRows` a row pinned on page one keeps rendering
 * on page two while having left `getRowModel().rows` entirely.
 */
function mockTable(model: string[], bands?: MockBands): DataTable<GridFeatures, object> {
	return {
		options: { enableRowPinning: bands !== undefined },
		getRowModel: () => ({ rows: model.map(asRow) }),
		getTopRows: () => (bands?.top ?? []).map(asRow),
		getCenterRows: () => (bands?.center ?? []).map(asRow),
		getBottomRows: () => (bands?.bottom ?? []).map(asRow),
	} as unknown as DataTable<GridFeatures, object>
}

const ids = (rows: Row<GridFeatures, object>[]) => rows.map((row) => row.id)

describe('getRowDropOrder', () => {
	it('is the row model while row pinning is off', () => {
		// Arrange
		const table = mockTable(['a', 'b', 'c'])

		// Act / Assert
		expect(ids(getRowDropOrder(table))).toEqual(['a', 'b', 'c'])
	})

	it('is the three bands concatenated — top, centre, bottom — while row pinning is on', () => {
		// `pinned-top` and `pinned-bottom` are absent from the row model on purpose: reading the row
		// model instead would hand both of them a `-1`, and would number the bottom-pinned row in the
		// middle of a table it is drawn at the end of.
		const table = mockTable(['b', 'c'], { top: ['pinned-top'], center: ['b', 'c'], bottom: ['pinned-bottom'] })

		expect(ids(getRowDropOrder(table))).toEqual(['pinned-top', 'b', 'c', 'pinned-bottom'])
	})

	it('is dense — exactly 0..n-1, no gap and no duplicate', () => {
		// The density `@dnd-kit/dom`'s OptimisticSortingPlugin requires per group. Asserted on the
		// derivation itself so a band that started repeating a row would fail here rather than
		// silently killing both axes of a live grid.
		const order = ids(getRowDropOrder(mockTable(['b', 'c'], { top: ['t'], center: ['b', 'c'], bottom: ['z'] })))

		expect(order.map((id) => order.indexOf(id))).toEqual([0, 1, 2, 3])
	})
})

describe('getRowDropIndex', () => {
	it('prefers a published list over the derivation', () => {
		// Arrange — the published list is a *window*, so the same row has different positions in the
		// two. Whichever this returns is observable, which is what makes the preference testable.
		const table = mockTable(['a', 'b', 'c', 'd', 'e'])

		// Act / Assert
		expect(getRowDropIndex(table, ['c', 'd', 'e'], 'd')).toBe(1)
		expect(getRowDropIndex(table, null, 'd')).toBe(3)
	})

	it('falls back to the derivation for every id when the list is null', () => {
		const table = mockTable(['a', 'b', 'c'])

		expect(['a', 'b', 'c'].map((id) => getRowDropIndex(table, null, id))).toEqual([0, 1, 2])
	})

	it('falls back to the pinned derivation, bands included, when the list is null', () => {
		const table = mockTable(['b'], { top: ['t'], center: ['b'], bottom: ['z'] })

		expect(['t', 'b', 'z'].map((id) => getRowDropIndex(table, null, id))).toEqual([0, 1, 2])
	})

	it('answers -1, never 0, for a row a published list omits', () => {
		// The distinction is the whole defect: `row.tsx` clamps with `Math.max(dropIndex, 0)`, so a
		// `0` here is indistinguishable from the first row and a drop silently lands at the top of
		// the grid. `-1` is what makes the hole reportable instead.
		const table = mockTable(['a', 'b', 'c'])

		expect(getRowDropIndex(table, ['b', 'c'], 'a')).toBe(-1)
	})

	it('answers -1 for a row the derivation omits', () => {
		const table = mockTable(['a', 'b'])

		expect(getRowDropIndex(table, null, 'nope')).toBe(-1)
	})
})

describe('the one reader of one list', () => {
	/*
	 * `getRowDropIndex` is the only reader there is: a row registers its own position here and
	 * **nothing resolves a position back**. A second reader — one turning a drop's landing index into
	 * the row at that place — is what the id-carrying drop is designed to do without, and the two
	 * could not have been kept in step: a virtualized body renumbers this list as its window scrolls,
	 * so a reader that registered and a reader that resolved would be counting in lists of different
	 * lengths, and a drop would commit rows past the one released on. `DndDropEvent` carries no such
	 * measurement; a drop names its target by id.
	 *
	 * What still has to hold is what a single reader is for — the density the drag library asserts per
	 * group: exactly `0..n-1`, no gap and no duplicate, over whichever of the three lists a body puts
	 * in front of it.
	 */
	const indicesOf = (table: DataTable<GridFeatures, object>, published: readonly string[] | null, ids: string[]) =>
		ids.map((id) => getRowDropIndex(table, published, id))

	it('numbers a published window densely, whatever those rows stand at in the model', () => {
		// Arrange — the window is the tail of a longer model, so a row's place in it and its place in
		// the model are different numbers. Only the former may reach the library.
		const table = mockTable(['a', 'b', 'c', 'd', 'e'])

		// Act / Assert
		expect(indicesOf(table, ['c', 'd', 'e'], ['c', 'd', 'e'])).toEqual([0, 1, 2])
	})

	it('numbers the derivation densely, bands included', () => {
		const table = mockTable(['b', 'c'], { top: ['t'], center: ['b', 'c'], bottom: ['z'] })

		expect(indicesOf(table, null, ['t', 'b', 'c', 'z'])).toEqual([0, 1, 2, 3])
	})

	it('numbers a published list that holds a row outside the window at its sorted place', () => {
		// The shape `virtual-body.tsx` publishes mid-drag: the window `c..e` plus the dragged row `a`
		// inserted at its index-sorted position rather than appended. Appended, the held row would be
		// numbered last while being drawn first, and every row in the window would be off by one.
		const table = mockTable(['a', 'b', 'c', 'd', 'e'])

		expect(indicesOf(table, ['a', 'c', 'd', 'e'], ['a', 'c', 'd', 'e'])).toEqual([0, 1, 2, 3])
	})
})

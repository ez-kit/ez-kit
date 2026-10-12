import { describe, expect, it } from 'vitest'

import { advanceDragProjection, DragPlacement, projectDragOrder } from './project-drag-order'

import type { DragProjection } from './project-drag-order'

const ORDER = ['a', 'b', 'c', 'd', 'e', 'f'] as const
const identity = (id: string) => id

describe('projectDragOrder', () => {
	it('returns the order itself when no drag is projected', () => {
		expect(projectDragOrder(ORDER, identity, null)).toBe(ORDER)
	})

	it('places the held item after a target below it', () => {
		const projection: DragProjection = { sourceId: 'b', targetId: 'e', placement: DragPlacement.After }

		expect(projectDragOrder(ORDER, identity, projection)).toEqual(['a', 'c', 'd', 'e', 'b', 'f'])
	})

	it('places the held item before a target above it', () => {
		const projection: DragProjection = { sourceId: 'e', targetId: 'b', placement: DragPlacement.Before }

		expect(projectDragOrder(ORDER, identity, projection)).toEqual(['a', 'e', 'b', 'c', 'd', 'f'])
	})

	it('places the held item at either end of the order', () => {
		expect(projectDragOrder(ORDER, identity, { sourceId: 'c', targetId: 'f', placement: DragPlacement.After })).toEqual(
			['a', 'b', 'd', 'e', 'f', 'c'],
		)
		expect(
			projectDragOrder(ORDER, identity, { sourceId: 'c', targetId: 'a', placement: DragPlacement.Before }),
		).toEqual(['c', 'a', 'b', 'd', 'e', 'f'])
	})

	it('leaves the order alone when the source or the target is not in it', () => {
		expect(projectDragOrder(ORDER, identity, { sourceId: 'zz', targetId: 'c', placement: DragPlacement.After })).toBe(
			ORDER,
		)
		expect(projectDragOrder(ORDER, identity, { sourceId: 'c', targetId: 'zz', placement: DragPlacement.After })).toBe(
			ORDER,
		)
	})

	it('reads ids through the accessor, so it projects rows as well as ids', () => {
		const rows = ORDER.map((id) => ({ id }))
		const projected = projectDragOrder(rows, (row) => row.id, {
			sourceId: 'a',
			targetId: 'c',
			placement: DragPlacement.After,
		})

		expect(projected.map((row) => row.id)).toEqual(['b', 'c', 'a', 'd', 'e', 'f'])
		// The same row objects, moved — never copies.
		expect(projected[2]).toBe(rows[0])
	})
})

describe('advanceDragProjection', () => {
	it('moves the held item past a target below it, the way the drag library displaces', () => {
		expect(advanceDragProjection(ORDER, null, 'b', 'e')).toEqual({
			sourceId: 'b',
			targetId: 'e',
			placement: DragPlacement.After,
		})
	})

	it('moves the held item in front of a target above it', () => {
		expect(advanceDragProjection(ORDER, null, 'e', 'b')).toEqual({
			sourceId: 'e',
			targetId: 'b',
			placement: DragPlacement.Before,
		})
	})

	/*
	 * The case that makes the projection stateful: which side of the target the held item lands on is
	 * decided by where it stands **now**, not where it started. Here `b` has already been carried below
	 * `e`, so hovering `d` puts it in front of `d` — whereas from the model order it would go after.
	 */
	it('decides the side from the projected order, not the model order', () => {
		const carried = advanceDragProjection(ORDER, null, 'b', 'e')
		const back = advanceDragProjection(ORDER, carried, 'b', 'd')

		expect(back).toEqual({ sourceId: 'b', targetId: 'd', placement: DragPlacement.Before })
		expect(projectDragOrder(ORDER, identity, back)).toEqual(['a', 'c', 'b', 'd', 'e', 'f'])
	})

	it('starts afresh when the held item changes', () => {
		const previous: DragProjection = { sourceId: 'a', targetId: 'f', placement: DragPlacement.After }

		expect(advanceDragProjection(ORDER, previous, 'e', 'c')).toEqual({
			sourceId: 'e',
			targetId: 'c',
			placement: DragPlacement.Before,
		})
	})

	it('keeps the previous projection for a self-hover or an id the order does not hold', () => {
		const previous: DragProjection = { sourceId: 'b', targetId: 'e', placement: DragPlacement.After }

		expect(advanceDragProjection(ORDER, previous, 'b', 'b')).toBe(previous)
		expect(advanceDragProjection(ORDER, previous, 'b', 'zz')).toBe(previous)
		expect(advanceDragProjection(ORDER, null, 'zz', 'c')).toBeNull()
	})
})

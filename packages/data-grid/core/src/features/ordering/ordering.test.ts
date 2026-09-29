import {
	columnOrderingFeature,
	columnPinningFeature,
	columnVisibilityFeature,
	rowSelectionFeature,
	tableFeatures,
} from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'

import { canMoveColumn, ColumnMoveDirection, ColumnMoveScope, moveColumn } from './ordering'

import type { ColumnDef } from '../../column/types'

type Row = { id: number; name: string; email: string; age: number }

const DATA: Row[] = [{ id: 1, name: 'Alice', email: 'alice@example.com', age: 30 }]

/**
 * Everything a column move can read: the order it writes, plus the pin band and the visibility
 * flag its neighbour rules consult. `rowSelectionFeature` is here for the one case that asks
 * whether a system column may move. Which of them a given case actually exercises is decided by
 * the config literal, not by the registration.
 */
const ORDERING = tableFeatures({
	columnOrderingFeature,
	columnPinningFeature,
	columnVisibilityFeature,
	rowSelectionFeature,
})

function makeTable(columns: ColumnDef<Row>[], config: Record<string, unknown> = {}) {
	return createTable({
		features: ORDERING,
		data: DATA,
		columns: createColumns<Row>(columns),
		ordering: true,
		...config,
	})
}

const FLAT: ColumnDef<Row>[] = [
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age' },
]

describe('moveColumn', () => {
	it('swaps a column with its neighbour, one step at a time', () => {
		// Arrange
		const table = makeTable(FLAT)

		// Act
		const order = moveColumn(table, 'email', ColumnMoveDirection.Start)

		// Assert
		expect(order).toEqual(['email', 'name', 'age'])
	})

	it('writes the complete order, never a partial one', () => {
		// A partial `columnOrder` reads to TanStack as "these first, then the rest as declared",
		// so anything short of the full list reorders columns nobody touched.
		const table = makeTable(FLAT)

		expect(moveColumn(table, 'name', ColumnMoveDirection.End)).toHaveLength(FLAT.length)
	})

	it('leaves the order alone at either end', () => {
		const table = makeTable(FLAT)

		expect(moveColumn(table, 'name', ColumnMoveDirection.Start)).toEqual(['name', 'email', 'age'])
		expect(canMoveColumn(table, 'name', ColumnMoveDirection.Start)).toBe(false)
		expect(canMoveColumn(table, 'age', ColumnMoveDirection.End)).toBe(false)
	})

	it('does not move a column the author locked', () => {
		const table = makeTable([
			{ accessorKey: 'name', header: 'Name' },
			{ accessorKey: 'email', header: 'Email', ordering: false },
			{ accessorKey: 'age', header: 'Age' },
		])

		expect(canMoveColumn(table, 'email', ColumnMoveDirection.Start)).toBe(false)
		expect(moveColumn(table, 'email', ColumnMoveDirection.Start)).toEqual(['name', 'email', 'age'])
	})

	it('does not land on a locked column either', () => {
		// `age` would swap with `email`, which is locked — so the step is unavailable rather
		// than jumping over it to `name`.
		const table = makeTable([
			{ accessorKey: 'name', header: 'Name' },
			{ accessorKey: 'email', header: 'Email', ordering: false },
			{ accessorKey: 'age', header: 'Age' },
		])

		expect(canMoveColumn(table, 'age', ColumnMoveDirection.Start)).toBe(false)
	})

	it('steps past a hidden column rather than landing on it', () => {
		// The user sees `name` and `age`; the step has to move `age` past what they can see.
		const table = makeTable(
			[
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'email', header: 'Email', visibility: { initialHidden: true } },
				{ accessorKey: 'age', header: 'Age' },
			],
			{ visibility: true },
		)

		expect(moveColumn(table, 'age', ColumnMoveDirection.Start)).toEqual(['age', 'name', 'email'])
	})

	it('keeps a move inside its pin band', () => {
		// `email` is pinned at the start; `name` is not. A step that crossed the band would read as a
		// pin, not a reorder.
		const table = makeTable(
			[
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'email', header: 'Email', pinning: 'start' },
				{ accessorKey: 'age', header: 'Age' },
			],
			{ pinning: true },
		)

		expect(canMoveColumn(table, 'email', ColumnMoveDirection.End)).toBe(false)
		expect(canMoveColumn(table, 'name', ColumnMoveDirection.Start)).toBe(false)
	})

	it('steps over a pinned column to reach a sibling of its own band', () => {
		// Pinning is orthogonal to the leaf order, so `email` can sit between two centre-band columns
		// while being rendered away from both of them. The user sees `name` and `age` side by side,
		// so a step between them is the step they are asking for. Treating the pinned column as the
		// end of the order instead left those two unable to be reordered from the menu at all — and
		// left a drag onto the same target succeeding where the menu entry refused, since a drop
		// compares the bands of its two ends and cannot see what lies between them.
		const table = makeTable(
			[
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'email', header: 'Email', pinning: 'start' },
				{ accessorKey: 'age', header: 'Age' },
			],
			{ pinning: true },
		)

		expect(canMoveColumn(table, 'name', ColumnMoveDirection.End)).toBe(true)
		expect(canMoveColumn(table, 'age', ColumnMoveDirection.Start)).toBe(true)
		expect(moveColumn(table, 'name', ColumnMoveDirection.End)).toEqual(['email', 'age', 'name', '__actions__'])
	})

	it('keeps a move inside its header group', () => {
		// Leaping into a sibling group would split that group's header cell in two.
		const table = makeTable([
			{
				id: 'person',
				header: 'Person',
				columns: [
					{ accessorKey: 'name', header: 'Name' },
					{ accessorKey: 'email', header: 'Email' },
				],
			},
			{ id: 'other', header: 'Other', columns: [{ accessorKey: 'age', header: 'Age' }] },
		])

		expect(moveColumn(table, 'email', ColumnMoveDirection.Start)).toEqual(['email', 'name', 'age'])
		expect(canMoveColumn(table, 'email', ColumnMoveDirection.End)).toBe(false)
		expect(canMoveColumn(table, 'age', ColumnMoveDirection.Start)).toBe(false)
	})

	it('moves columns in a grid that registers neither pinning nor visibility', () => {
		// `getIsPinned` and `getIsVisible` come from `columnPinningFeature` and
		// `columnVisibilityFeature`, so a grid without them has no such members. One band and
		// nothing hidden is what the move rules fall back to, rather than crashing on the read.
		const table = createTable({
			features: tableFeatures({ columnOrderingFeature }),
			data: DATA,
			columns: createColumns<Row>(FLAT),
			ordering: true,
		})

		expect(moveColumn(table, 'email', ColumnMoveDirection.Start)).toEqual(['email', 'name', 'age'])
		// Both directions of a middle column: each one reaches the band read and the visibility
		// read for two columns and compares them. `name` at the start would answer `false`
		// whether or not the features were registered, so it would prove nothing here.
		expect(canMoveColumn(table, 'email', ColumnMoveDirection.Start)).toBe(true)
		expect(canMoveColumn(table, 'email', ColumnMoveDirection.End)).toBe(true)
	})

	it('never moves a system column', () => {
		const table = makeTable(FLAT, { selection: true })

		expect(canMoveColumn(table, '__selection__', ColumnMoveDirection.End)).toBe(false)
	})
})

describe('ColumnMoveScope.All', () => {
	const WITH_HIDDEN: ColumnDef<Row>[] = [
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'email', header: 'Email', visibility: { initialHidden: true } },
		{ accessorKey: 'age', header: 'Age' },
	]

	/** The same, with the hidden column also pinned — a hidden column in a band of its own. */
	const WITH_HIDDEN_PINNED: ColumnDef<Row>[] = [
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'email', header: 'Email', pinning: 'start', visibility: { initialHidden: true } },
		{ accessorKey: 'age', header: 'Age' },
	]

	it('lands on a hidden neighbour instead of stepping past it', () => {
		// The column panel lists hidden columns, so a step there moves past the row the user
		// can see in *that* surface — one place, not two.
		const table = makeTable(WITH_HIDDEN, { visibility: true })

		expect(moveColumn(table, 'age', ColumnMoveDirection.Start, ColumnMoveScope.All)).toEqual(['name', 'age', 'email'])
	})

	it('leaves a column with only a hidden neighbour movable', () => {
		const table = makeTable(WITH_HIDDEN, { visibility: true })

		expect(canMoveColumn(table, 'email', ColumnMoveDirection.Start, ColumnMoveScope.All)).toBe(true)
		expect(canMoveColumn(table, 'email', ColumnMoveDirection.End, ColumnMoveScope.All)).toBe(true)
	})

	it('is still bound by locks under All', () => {
		// Widening which neighbours count says nothing about which moves are legal. Each assertion
		// here is refused by a **lock**, and deliberately so: `age` carries `ordering: false`, which
		// stops it moving at the `isMovable` gate and stops it being landed on from `name`. The band
		// is covered by the two cases below rather than here — before bands became skippable this one
		// test carried all three reasons, and two of them were passing for the lock's sake while
		// reading as band coverage.
		const table = makeTable(
			[
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'email', header: 'Email', pinning: 'start', visibility: { initialHidden: true } },
				{ accessorKey: 'age', header: 'Age', ordering: false },
			],
			{ pinning: true, visibility: true },
		)

		expect(canMoveColumn(table, 'age', ColumnMoveDirection.Start, ColumnMoveScope.All)).toBe(false)
		expect(canMoveColumn(table, 'name', ColumnMoveDirection.End, ColumnMoveScope.All)).toBe(false)
	})

	it('refuses a move whose band holds nothing beyond it, under All', () => {
		// The genuine band refusal: `email` is alone in the start band, so widening the scope finds
		// it no neighbour there. This is what stays `false` after a foreign band became something a
		// step walks over rather than stops at.
		const table = makeTable(WITH_HIDDEN_PINNED, { pinning: true, visibility: true })

		expect(canMoveColumn(table, 'email', ColumnMoveDirection.End, ColumnMoveScope.All)).toBe(false)
		expect(canMoveColumn(table, 'email', ColumnMoveDirection.Start, ColumnMoveScope.All)).toBe(false)
	})

	it('steps over a hidden pinned column to an unlocked sibling, under All', () => {
		// The pinned column is hidden *and* in another band, so under All it is passed twice over:
		// once as a foreign band, and not at all as a hidden column, since All counts those. What
		// makes this case worth its own test is that something unlocked lies beyond it — the two
		// assertions above would both hold even if the walk stopped at the pinned column.
		const table = makeTable(WITH_HIDDEN_PINNED, { pinning: true, visibility: true })

		expect(canMoveColumn(table, 'name', ColumnMoveDirection.End, ColumnMoveScope.All)).toBe(true)
		expect(moveColumn(table, 'name', ColumnMoveDirection.End, ColumnMoveScope.All)).toEqual([
			'email',
			'age',
			'name',
			'__actions__',
		])
	})

	it('defaults to the visible scope, so the header is unchanged', () => {
		const table = makeTable(WITH_HIDDEN, { visibility: true })

		expect(moveColumn(table, 'age', ColumnMoveDirection.Start)).toEqual(['age', 'name', 'email'])
	})
})

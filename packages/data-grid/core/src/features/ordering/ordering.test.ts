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

	it('is still bound by pin bands, header groups and locks', () => {
		// Widening which neighbours count says nothing about which moves are legal.
		const table = makeTable(
			[
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'email', header: 'Email', pinning: 'start', visibility: { initialHidden: true } },
				{ accessorKey: 'age', header: 'Age', ordering: false },
			],
			{ pinning: true, visibility: true },
		)

		expect(canMoveColumn(table, 'email', ColumnMoveDirection.End, ColumnMoveScope.All)).toBe(false)
		expect(canMoveColumn(table, 'age', ColumnMoveDirection.Start, ColumnMoveScope.All)).toBe(false)
		expect(canMoveColumn(table, 'name', ColumnMoveDirection.End, ColumnMoveScope.All)).toBe(false)
	})

	it('defaults to the visible scope, so the header is unchanged', () => {
		const table = makeTable(WITH_HIDDEN, { visibility: true })

		expect(moveColumn(table, 'age', ColumnMoveDirection.Start)).toEqual(['age', 'name', 'email'])
	})
})

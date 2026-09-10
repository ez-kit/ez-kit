import { describe, expect, it } from 'vitest'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'

import { canMoveColumn, ColumnMoveDirection, moveColumn } from './ordering'

import type { ColumnDef } from '../../column/types'

type Row = { id: number; name: string; email: string; age: number }

const DATA: Row[] = [{ id: 1, name: 'Alice', email: 'alice@example.com', age: 30 }]

function makeTable(columns: ColumnDef<Row>[], config: Record<string, unknown> = {}) {
	return createTable<Row>({ data: DATA, columns: createColumns<Row>(columns), ordering: true, ...config })
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
		// `email` is pinned left; `name` is not. A step that crossed the band would read as a
		// pin, not a reorder.
		const table = makeTable(
			[
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'email', header: 'Email', pinning: 'left' },
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

	it('never moves a system column', () => {
		const table = makeTable(FLAT, { selection: true })

		expect(canMoveColumn(table, '__selection__', ColumnMoveDirection.End)).toBe(false)
	})
})

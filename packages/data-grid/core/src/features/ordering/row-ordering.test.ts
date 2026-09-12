import { describe, expect, it } from 'vitest'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'

import { applyRowMove, canMoveRow, moveRow, RowMoveDirection } from './row-ordering'

type Row = { id: string; name: string }

const DATA: Row[] = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
	{ id: 'c', name: 'C' },
]

function makeTable(config: Record<string, unknown> = {}, data: Row[] = DATA) {
	return createTable<Row>({
		data,
		columns: createColumns<Row>([{ accessorKey: 'name', header: 'Name' }]),
		getRowId: (row) => row.id,
		...config,
	})
}

describe('canMoveRow', () => {
	it('lets a middle row move both ways', () => {
		// Arrange
		const table = makeTable()

		// Act + Assert
		expect(canMoveRow(table, 'b', RowMoveDirection.Up)).toBe(true)
		expect(canMoveRow(table, 'b', RowMoveDirection.Down)).toBe(true)
	})

	it('stops at either end of the order', () => {
		const table = makeTable()

		expect(canMoveRow(table, 'a', RowMoveDirection.Up)).toBe(false)
		expect(canMoveRow(table, 'c', RowMoveDirection.Down)).toBe(false)
	})

	it('refuses a row id the table does not have', () => {
		expect(canMoveRow(makeTable(), 'nope', RowMoveDirection.Up)).toBe(false)
	})

	it('refuses every move while a sort is applied', () => {
		// Sorting computes the order from the data, so a manual move would be recomputed away
		// on the next render and the row would visibly spring back.
		const table = makeTable({ sorting: true })
		table.setSorting([{ id: 'name', desc: false }])

		expect(canMoveRow(table, 'b', RowMoveDirection.Up)).toBe(false)
		expect(canMoveRow(table, 'b', RowMoveDirection.Down)).toBe(false)
	})

	it('does not move a row into a different pinning band', () => {
		const table = makeTable({ pinning: { row: { top: true, bottom: true } } })
		table.getRow('a').pin('top', false, false)

		// 'b' now leads the centre band. What sits above it is pinned, so it is not a neighbour.
		expect(canMoveRow(table, 'b', RowMoveDirection.Up)).toBe(false)
		expect(canMoveRow(table, 'b', RowMoveDirection.Down)).toBe(true)
	})
})

describe('moveRow', () => {
	it('describes the swap and performs none of it', () => {
		const table = makeTable()

		expect(moveRow(table, 'b', RowMoveDirection.Down)).toEqual({
			rowId: 'b',
			targetRowId: 'c',
			direction: RowMoveDirection.Down,
		})
		expect(table.getRowModel().rows.map((row) => row.id)).toEqual(['a', 'b', 'c'])
	})

	it('returns undefined at an end', () => {
		expect(moveRow(makeTable(), 'a', RowMoveDirection.Up)).toBeUndefined()
	})
})

describe('applyRowMove', () => {
	it('moves the row past its target', () => {
		const move = { rowId: 'b', targetRowId: 'c', direction: RowMoveDirection.Down }

		expect(applyRowMove(['a', 'b', 'c'], move)).toEqual(['a', 'c', 'b'])
	})

	it('moves the row up past its target', () => {
		const move = { rowId: 'c', targetRowId: 'b', direction: RowMoveDirection.Up }

		expect(applyRowMove(['a', 'b', 'c'], move)).toEqual(['a', 'c', 'b'])
	})

	it('leaves an order that does not name both rows alone', () => {
		const order = ['a', 'b', 'c']
		const move = { rowId: 'z', targetRowId: 'c', direction: RowMoveDirection.Down }

		expect(applyRowMove(order, move)).toEqual(order)
	})

	it('does not mutate its input', () => {
		const order = ['a', 'b', 'c']

		applyRowMove(order, { rowId: 'b', targetRowId: 'c', direction: RowMoveDirection.Down })

		expect(order).toEqual(['a', 'b', 'c'])
	})
})

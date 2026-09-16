import {
	createExpandedRowModel,
	createSortedRowModel,
	rowExpandingFeature,
	rowPinningFeature,
	rowSortingFeature,
	tableFeatures,
} from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'
import { rowOrderingFeature } from '../entry'

import { applyRowMove, canMoveRow, moveRow, RowMoveDirection } from './row-ordering'

type Row = { id: string; name: string }

const DATA: Row[] = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
	{ id: 'c', name: 'C' },
]

/**
 * Every feature a move reads: `rowOrderingFeature` owns the `rowOrder` slice these helpers
 * project through, `rowSortingFeature` owns the `sorting` slice that disables a move, and
 * `rowPinningFeature` supplies the band boundary. Which of them a case exercises is decided by
 * the config literal.
 */
const ROW_ORDERING = tableFeatures({
	rowOrderingFeature,
	rowSortingFeature,
	rowPinningFeature,
	sortedRowModel: createSortedRowModel(),
})

/** The same, plus what tree data needs to render its sub-rows. */
const ROW_ORDERING_TREE = tableFeatures({
	rowOrderingFeature,
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})

function makeTable(config: Record<string, unknown> = {}, data: Row[] = DATA) {
	return createTable({
		features: ROW_ORDERING,
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

describe('canMoveRow in a tree', () => {
	type Node = { id: string; name: string; children?: Node[] }

	const TREE: Node[] = [
		{
			id: 'p1',
			name: 'P1',
			children: [
				{ id: 'c1', name: 'C1' },
				{ id: 'c2', name: 'C2' },
			],
		},
		{ id: 'p2', name: 'P2', children: [{ id: 'c3', name: 'C3' }] },
	]

	function makeTreeTable() {
		const table = createTable({
			features: ROW_ORDERING_TREE,
			data: TREE,
			columns: createColumns<Node>([{ accessorKey: 'name', header: 'Name' }]),
			getRowId: (row) => row.id,
			ordering: { row: { onChange: () => undefined } },
			expanding: { mode: 'tree', getSubRows: (row) => row.children },
		})
		table.toggleAllRowsExpanded(true)
		return table
	}

	it('steps a parent over its own expanded children', () => {
		// What follows an expanded `p1` in the rendered list is `c1`, not `p2`. Treating that
		// child as a boundary would leave every expanded row unable to move in either direction.
		const table = makeTreeTable()

		expect(moveRow(table, 'p1', RowMoveDirection.Down)).toEqual({
			rowId: 'p1',
			targetRowId: 'p2',
			direction: RowMoveDirection.Down,
		})
		expect(moveRow(table, 'p2', RowMoveDirection.Up)).toEqual({
			rowId: 'p2',
			targetRowId: 'p1',
			direction: RowMoveDirection.Up,
		})
	})

	it('keeps a child inside its own subtree', () => {
		// `c2` is the last child of `p1`; the next rendered row is `p2`, a different parent.
		// Crossing there would change the row's parent, which is a different operation.
		const table = makeTreeTable()

		expect(canMoveRow(table, 'c2', RowMoveDirection.Down)).toBe(false)
		expect(canMoveRow(table, 'c1', RowMoveDirection.Up)).toBe(false)
		expect(canMoveRow(table, 'c1', RowMoveDirection.Down)).toBe(true)
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

	it('moves rows in a grid that registers neither sorting nor row pinning', () => {
		// `sorting` is a foreign slice and `getIsPinned` a foreign member: a grid with neither
		// feature never sorts and has one band, which is what the move rules fall back to rather
		// than throwing on the read.
		const table = createTable({
			features: tableFeatures({ rowOrderingFeature }),
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'name', header: 'Name' }]),
			getRowId: (row) => row.id,
		})

		expect(moveRow(table, 'b', RowMoveDirection.Down)).toEqual({
			rowId: 'b',
			targetRowId: 'c',
			direction: RowMoveDirection.Down,
		})
	})

	it('names the missing feature when the table never registered row ordering', () => {
		// `rowOrder` is `rowOrderingFeature`'s own slice. Reading it off a table that does not
		// have the feature is a composition mistake, and the accessor says so by name rather
		// than letting an empty order compute every move from the original positions.
		const table = createTable({
			features: tableFeatures({}),
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'name', header: 'Name' }]),
			getRowId: (row) => row.id,
		})

		expect(() => moveRow(table, 'b', RowMoveDirection.Down)).toThrow(/state slice "rowOrder" is missing/)
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

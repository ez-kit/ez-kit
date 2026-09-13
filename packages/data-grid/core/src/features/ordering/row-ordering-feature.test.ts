import { describe, expect, it, vi } from 'vitest'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'
import { ACTIONS_COLUMN_ID } from '../../system-columns'

import { RowMoveDirection } from './row-ordering'

import type { OrderingConfig } from '../../types'

type Row = { id: string; name: string }

const DATA: Row[] = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
	{ id: 'c', name: 'C' },
]

function makeTable(ordering: boolean | OrderingConfig) {
	return createTable<Row>({
		data: DATA,
		columns: createColumns<Row>([{ accessorKey: 'name', header: 'Name' }]),
		getRowId: (row) => row.id,
		ordering,
	})
}

describe('row ordering feature', () => {
	it('starts with an empty order', () => {
		expect(makeTable({ row: true }).getState().rowOrder).toEqual([])
	})

	it('seeds the complete order on the first uncontrolled move', () => {
		// Arrange
		const table = makeTable({ row: true })

		// Act
		table.ordering.moveRow('a', RowMoveDirection.Down)

		// Assert
		expect(table.getState().rowOrder).toEqual(['b', 'a', 'c'])
	})

	it('builds each further move on the order it already holds', () => {
		const table = makeTable({ row: true })

		table.ordering.moveRow('a', RowMoveDirection.Down)
		table.ordering.moveRow('a', RowMoveDirection.Down)

		expect(table.getState().rowOrder).toEqual(['b', 'c', 'a'])
	})

	it('reports the move and writes nothing when controlled', () => {
		const onChange = vi.fn()
		const table = makeTable({ row: { onChange } })

		table.ordering.moveRow('a', RowMoveDirection.Down)

		expect(onChange).toHaveBeenCalledWith({
			rowId: 'a',
			targetRowId: 'b',
			direction: RowMoveDirection.Down,
		})
		expect(table.getState().rowOrder).toEqual([])
	})

	it('does nothing at all for an unavailable move', () => {
		const onChange = vi.fn()
		const table = makeTable({ row: { onChange } })

		table.ordering.moveRow('a', RowMoveDirection.Up)

		expect(onChange).not.toHaveBeenCalled()
		expect(table.getState().rowOrder).toEqual([])
	})

	it('moves a row the current order does not name yet', () => {
		// The order is written over every row the table holds, not over the rendered ones. A
		// grid that showed a subset when the first move happened — one page, one filter — would
		// otherwise hold an order naming only those rows, and every later move outside it would
		// be dropped while its menu entry stayed enabled.
		const table = makeTable({ row: true })
		table.setState((prev) => ({ ...prev, rowOrder: ['b', 'a'] }))

		table.ordering.moveRow('c', RowMoveDirection.Up)

		expect(table.getState().rowOrder).toEqual(['b', 'c', 'a'])
	})

	it('leaves the row axis off for a bare `ordering: true`', () => {
		// `true` means columns only, and keeps meaning that — an upgrade must not hand an
		// existing grid an affordance nobody asked for.
		const table = makeTable(true)

		expect(table.ordering.canMoveRow('a', RowMoveDirection.Down)).toBe(false)

		table.ordering.moveRow('a', RowMoveDirection.Down)

		expect(table.getState().rowOrder).toEqual([])
	})

	it('honours `enabled: false` on the axis', () => {
		const table = makeTable({ row: { enabled: false } })

		expect(table.ordering.canMoveRow('a', RowMoveDirection.Down)).toBe(false)
	})
})

describe('row ordering under a partial row model', () => {
	type Wide = { id: string; name: string; group: string }

	const WIDE: Wide[] = [
		{ id: '0', name: 'A', group: 'x' },
		{ id: '1', name: 'B', group: 'y' },
		{ id: '2', name: 'C', group: 'x' },
		{ id: '3', name: 'D', group: 'y' },
		{ id: '4', name: 'E', group: 'x' },
		{ id: '5', name: 'F', group: 'y' },
	]

	function makeWideTable(extra: Partial<Parameters<typeof createTable<Wide>>[0]> = {}) {
		return createTable<Wide>({
			data: WIDE,
			columns: createColumns<Wide>([
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'group', header: 'Group' },
			]),
			getRowId: (row) => row.id,
			ordering: { row: true },
			...extra,
		})
	}

	it('keeps moving rows after a move made on another page', () => {
		// Arrange
		const table = makeWideTable({ pagination: { pageSize: 3 } })
		table.ordering.moveRow('0', RowMoveDirection.Down)
		table.setPageIndex(1)

		// Act
		table.ordering.moveRow('3', RowMoveDirection.Down)

		// Assert
		expect(table.getState().rowOrder).toEqual(['1', '0', '2', '4', '3', '5'])
	})

	it('keeps moving rows a filter hid when the move was made', () => {
		// Arrange
		const table = makeWideTable({ filtering: true })
		table.setColumnFilters([{ id: 'group', value: 'x' }])
		table.ordering.moveRow('0', RowMoveDirection.Down)
		table.setColumnFilters([])

		// Act
		table.ordering.moveRow('1', RowMoveDirection.Down)

		// Assert
		expect(table.getState().rowOrder).toEqual(['2', '1', '0', '3', '4', '5'])
	})
})

describe('row ordering and tree sub-rows', () => {
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
		{ id: 'p2', name: 'P2' },
	]

	function makeTreeTable(ordering: OrderingConfig) {
		const table = createTable<Node>({
			data: TREE,
			columns: createColumns<Node>([{ accessorKey: 'name', header: 'Name' }]),
			getRowId: (row) => row.id,
			ordering,
			expanding: { mode: 'tree', getSubRows: (row) => row.children },
		})
		table.toggleAllRowsExpanded(true)
		return table
	}

	it('offers no uncontrolled move to a sub-row', () => {
		// The uncontrolled order is a list of ids over the top-level `data` array, so a child's
		// position — which lives inside its parent's row object — is not something it can
		// express. An enabled entry that records a move and renders identically is the defect
		// this guards against; the entry is disabled instead.
		const table = makeTreeTable({ row: true })

		expect(table.ordering.canMoveRow('c1', RowMoveDirection.Down)).toBe(false)

		table.ordering.moveRow('c1', RowMoveDirection.Down)

		expect(table.getState().rowOrder).toEqual([])
	})

	it('still moves a top-level row in a tree', () => {
		const table = makeTreeTable({ row: true })

		table.ordering.moveRow('p1', RowMoveDirection.Down)

		expect(table.getState().rowOrder).toEqual(['p2', 'p1'])
	})

	it('reports a sub-row move when controlled', () => {
		// Controlled mode owns the data and can splice a child list, so the limit does not apply.
		const onChange = vi.fn()
		const table = makeTreeTable({ row: { onChange } })

		expect(table.ordering.canMoveRow('c1', RowMoveDirection.Down)).toBe(true)

		table.ordering.moveRow('c1', RowMoveDirection.Down)

		expect(onChange).toHaveBeenCalledWith({
			rowId: 'c1',
			targetRowId: 'c2',
			direction: RowMoveDirection.Down,
		})
	})
})

describe('row ordering row identity', () => {
	it('warns when the rows have no id to order by', () => {
		// Arrange
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		// Act
		createTable<{ name: string }>({
			data: [{ name: 'A' }],
			columns: createColumns<{ name: string }>([{ accessorKey: 'name', header: 'Name' }]),
			ordering: { row: true },
		})

		// Assert
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('getRowId'))
		warn.mockRestore()
	})

	it('stays quiet when the rows carry an id', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		makeTable({ row: true })

		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})

	it('stays quiet when the feature is off', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		createTable<{ name: string }>({
			data: [{ name: 'A' }],
			columns: createColumns<{ name: string }>([{ accessorKey: 'name', header: 'Name' }]),
		})

		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})

describe('row ordering and the actions column', () => {
	it('summons the actions column on its own', () => {
		// Row pinning already does this — the move entries live in that cell, so the column has
		// to be there even in a grid with no edit, delete or custom action.
		const table = makeTable({ row: true })

		expect(table.getAllLeafColumns().map((column) => column.id)).toContain(ACTIONS_COLUMN_ID)
	})

	it('does not summon it for the column axis', () => {
		const table = makeTable({ column: true })

		expect(table.getAllLeafColumns().map((column) => column.id)).not.toContain(ACTIONS_COLUMN_ID)
	})
})

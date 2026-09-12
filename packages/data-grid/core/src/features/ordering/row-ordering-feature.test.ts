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

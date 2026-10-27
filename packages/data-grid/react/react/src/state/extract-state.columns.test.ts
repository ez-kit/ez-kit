import {
	ACTIONS_COLUMN_ID,
	ColumnMoveDirection,
	createColumns,
	createTable,
	moveColumn,
	SELECTION_COLUMN_ID,
} from '@ez-kit/data-grid-core'
import { describe, expect, it, vi } from 'vitest'

import { TEST_FEATURES } from '../test-utils'

import { extractState } from './extract-state'

import type { GridFeatures } from '../types'
import type { ColumnPinningState } from '@tanstack/table-core'

type Row = { id: number; name: string; email: string; age: number }

const DATA: Row[] = [{ id: 1, name: 'Alice', email: 'alice@example.com', age: 30 }]

const COLUMNS = createColumns<Row>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age' },
])

function makeTable(config: Record<string, unknown> = {}) {
	return createTable<GridFeatures, Row>({
		features: TEST_FEATURES,
		data: DATA,
		columns: COLUMNS,
		selection: true,
		deleting: { onDelete: () => {} },
		ordering: true,
		pinning: { column: true },
		visibility: true,
		...config,
	})
}

describe('extractState — the columns the config places are not persisted', () => {
	it('persists empty pins for a grid whose user pinned nothing', () => {
		expect(extractState(makeTable()).columnPinning).toEqual({ start: [], end: [] })
	})

	it('persists the column the user pinned, and only that one', () => {
		const table = makeTable()
		table.getColumn('name')?.pin('start')
		table.getColumn('age')?.pin('end')

		expect(extractState(table).columnPinning).toEqual({ start: ['name'], end: ['age'] })
	})

	it('persists a column order without the forced columns', () => {
		const table = makeTable()
		table.setColumnOrder(moveColumn(table, 'age', ColumnMoveDirection.Start))

		const order = extractState(table).columnOrder
		expect(order).toEqual(['name', 'age', 'email'])
	})

	it('does not persist the visibility a system column was forced back to', () => {
		const table = makeTable()
		table.setColumnVisibility({ [ACTIONS_COLUMN_ID]: false, email: false })

		expect(extractState(table).columnVisibility).toEqual({ email: false })
	})

	it('does not strip a system column the config only seeds, so its absence is the user’s', () => {
		const table = makeTable({ selection: { column: { pinning: { initialSide: 'start' } } } })
		table.getColumn(SELECTION_COLUMN_ID)?.pin(false)
		table.getColumn('name')?.pin('start')

		expect(extractState(table).columnPinning?.start).toEqual(['name'])
	})

	it('keeps a seeded system column the user left pinned', () => {
		const table = makeTable({ selection: { column: { pinning: { initialSide: 'start' } } } })

		expect(extractState(table).columnPinning?.start).toEqual([SELECTION_COLUMN_ID])
	})

	it('extracts as before from a table that carries no grid options', () => {
		const table = makeTable()
		const bare = { store: table.store }

		expect(extractState(bare).columnPinning?.start).toContain(SELECTION_COLUMN_ID)
	})
})

describe('the low-level channels still carry the forced columns', () => {
	it('reports them to onChange.columnPinning', () => {
		const onChange = vi.fn<(next: ColumnPinningState) => void>()
		const table = makeTable({ pinning: { column: { onChange } } })

		table.getColumn('name')?.pin('start')

		expect(onChange).toHaveBeenLastCalledWith({ start: [SELECTION_COLUMN_ID, 'name'], end: [ACTIONS_COLUMN_ID] })
		expect(table.store.state.columnPinning.start).toContain(SELECTION_COLUMN_ID)
	})
})

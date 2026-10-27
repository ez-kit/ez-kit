import {
	columnOrderingFeature,
	columnPinningFeature,
	columnVisibilityFeature,
	rowSelectionFeature,
	tableFeatures,
} from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { createColumns } from '../column/create-columns'
import { createTable } from '../create-table'
import { deletingFeature } from '../features/deleting'
import { ColumnMoveDirection, dropColumn, moveColumn } from '../features/ordering'
import { ACTIONS_COLUMN_ID, SELECTION_COLUMN_ID } from '../system-columns'

import type { ColumnDef } from '../column/types'

type Row = { id: number; name: string; email: string; age: number }

const DATA: Row[] = [{ id: 1, name: 'Alice', email: 'alice@example.com', age: 30 }]

const FEATURES = tableFeatures({
	columnOrderingFeature,
	columnPinningFeature,
	columnVisibilityFeature,
	rowSelectionFeature,
	deletingFeature,
})

const COLUMNS: ColumnDef<Row>[] = [
	{ accessorKey: 'id', header: 'Id', pinning: 'start' },
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age' },
]

function makeTable(config: Record<string, unknown> = {}) {
	return createTable({
		features: FEATURES,
		data: DATA,
		columns: createColumns<Row>(COLUMNS),
		selection: true,
		deleting: { onDelete: () => {} },
		ordering: true,
		pinning: { column: true },
		visibility: true,
		...config,
	})
}

function leafIds(table: ReturnType<typeof makeTable>): string[] {
	return table.getAllLeafColumns().map((column) => column.id)
}

describe('table.grid.columnState', () => {
	it('enforces and strips against this table’s own forced columns', () => {
		const { columnState } = makeTable().grid

		expect(columnState.enforce({ columnPinning: { start: ['name'], end: [] } }).columnPinning).toEqual({
			start: [SELECTION_COLUMN_ID, 'id', 'name'],
			end: [ACTIONS_COLUMN_ID],
		})
		expect(
			columnState.strip({ columnPinning: { start: [SELECTION_COLUMN_ID, 'id', 'name'], end: [ACTIONS_COLUMN_ID] } })
				.columnPinning,
		).toEqual({ start: ['name'], end: [] })
	})

	it('a column order seeded without the forced columns puts them back at its edges', () => {
		const table = makeTable({ initialState: { columnOrder: ['age', 'name', 'email'] } })
		expect(leafIds(table)).toEqual([SELECTION_COLUMN_ID, 'id', 'age', 'name', 'email', ACTIONS_COLUMN_ID])
	})

	it('a column order written without the forced columns puts them back too', () => {
		const table = makeTable()
		table.setColumnOrder(['name', 'email', 'age'])
		expect(leafIds(table)).toEqual([SELECTION_COLUMN_ID, 'id', 'name', 'email', 'age', ACTIONS_COLUMN_ID])
	})

	it('a partial column order still ends with the actions column', () => {
		const table = makeTable({ initialState: { columnOrder: ['email', 'name'] } })
		expect(leafIds(table)).toEqual([SELECTION_COLUMN_ID, 'id', 'email', 'name', 'age', ACTIONS_COLUMN_ID])
	})

	it('an empty seeded column order stays empty, since it means the declared order', () => {
		const table = makeTable({ initialState: { columnOrder: [] } })
		expect(table.store.state.columnOrder).toEqual([])
	})
})

describe('enforce(strip(state)) reproduces a state the grid reached on its own', () => {
	function expectRoundTrip(table: ReturnType<typeof makeTable>): void {
		const state = table.store.state
		const { columnState } = table.grid
		const restored = columnState.enforce(columnState.strip(state))

		expect(restored.columnPinning).toEqual(state.columnPinning)
		expect(restored.columnOrder).toEqual(state.columnOrder)
		const visible = (s: typeof state) =>
			leafIds(table).filter((id) => (s.columnVisibility as Record<string, boolean>)[id] !== false)
		expect(visible(restored)).toEqual(visible(state))
	}

	it('after pinning a column at either side', () => {
		const table = makeTable()
		table.getColumn('name')?.pin('start')
		table.getColumn('age')?.pin('end')
		expectRoundTrip(table)
	})

	it('after moving a column by a step', () => {
		const table = makeTable()
		table.setColumnOrder(moveColumn(table, 'age', ColumnMoveDirection.Start))
		expectRoundTrip(table)
	})

	it('after dropping a column onto another', () => {
		const table = makeTable()
		table.setColumnOrder(dropColumn(table, 'age', 'name'))
		expectRoundTrip(table)
	})

	it('after a write that tried to hide and unpin the system columns', () => {
		const table = makeTable()
		table.setColumnVisibility({ [ACTIONS_COLUMN_ID]: false, email: false })
		table.setColumnPinning({ start: [], end: [] })
		expectRoundTrip(table)
	})
})

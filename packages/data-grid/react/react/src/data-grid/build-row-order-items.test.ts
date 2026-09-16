import { createColumns, createTable, defaultMessages } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { isGridMenuItemSlot } from '../menu'
import { TEST_FEATURES } from '../test-utils'
import { RowActionId } from '../types'

import { buildRowOrderItems } from './build-row-order-items'

import type { GridMenuItemDef } from '../menu'
import type { DataTable, GridFeatures } from '../types'
import type { OrderingConfig } from '@ez-kit/data-grid-core'

type User = { id: string; name: string }

const DATA: User[] = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
	{ id: 'c', name: 'C' },
]

const COLUMNS = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])

function makeTable(ordering: OrderingConfig = { row: true }): DataTable<GridFeatures, User> {
	return createTable<GridFeatures, User>({
		features: TEST_FEATURES,
		data: DATA,
		columns: COLUMNS,
		getRowId: (row) => row.id,
		ordering,
	})
}

/** The entries for one row, narrowed to the half that carries a label and a disabled state. */
function items(table: DataTable<GridFeatures, User>, rowId: string): GridMenuItemDef[] {
	return buildRowOrderItems(table.getRow(rowId), table, defaultMessages.rowActions).map((item) => {
		if (isGridMenuItemSlot(item)) throw new Error('the grid builds described entries, never slots')
		return item
	})
}

describe('buildRowOrderItems', () => {
	it('lists both directions, in reading order', () => {
		// Arrange
		const table = makeTable()

		// Act
		const entries = items(table, 'b')

		// Assert
		expect(entries.map((entry) => entry.id)).toEqual([RowActionId.MoveUp, RowActionId.MoveDown])
		expect(entries.map((entry) => entry.label)).toEqual(['Move up', 'Move down'])
	})

	it('disables only the direction that has no neighbour', () => {
		const table = makeTable()

		expect(items(table, 'a').map((entry) => entry.disabled)).toEqual([true, false])
		expect(items(table, 'c').map((entry) => entry.disabled)).toEqual([false, true])
		expect(items(table, 'b').map((entry) => entry.disabled)).toEqual([false, false])
	})

	it('disables both while a sort is applied', () => {
		const table = createTable<GridFeatures, User>({
			features: TEST_FEATURES,
			data: DATA,
			columns: COLUMNS,
			getRowId: (row) => row.id,
			ordering: { row: true },
			sorting: true,
		})
		table.setSorting([{ id: 'name', desc: false }])

		expect(items(table, 'b').every((entry) => entry.disabled)).toBe(true)
	})

	it('moves the row when an entry is chosen', () => {
		const table = makeTable()

		items(table, 'a')[1]?.onAction()

		expect(table.store.state.rowOrder).toEqual(['b', 'a', 'c'])
	})
})

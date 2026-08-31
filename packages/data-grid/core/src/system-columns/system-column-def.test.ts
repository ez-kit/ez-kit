import { describe, expect, it } from 'vitest'

import { createTable } from '../create-table'

import { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, SELECTION_COLUMN_ID } from './system-columns'

type Row = { id: string; name: string; children?: Row[] }

const DATA: Row[] = [{ id: '1', name: 'Alice' }]
const COLUMNS = [{ accessorKey: 'name' as const }]

const noop = (): void => undefined

/**
 * The three auto-injected columns took no configuration at all: their header rendered
 * nothing, their width was a constant, and their pinning was decided for them — with the
 * expand column, alone among the three, pinned nowhere. `selection.column`,
 * `expanding.column` and `rowActions.column` give them the same column vocabulary every
 * other column has.
 */
describe('system column defaults', () => {
	it('pins all three system columns, expand included', () => {
		const table = createTable<Row>({
			data: DATA,
			columns: COLUMNS,
			selection: true,
			expanding: true,
			deleting: { onDelete: noop },
		})

		const sideOf = (id: string) => {
			const pinning = table.getColumn(id)?.columnDef.meta?.pinning
			return pinning !== false && pinning !== undefined ? pinning.side : undefined
		}

		expect(sideOf(SELECTION_COLUMN_ID)).toBe('left')
		// Was pinned nowhere, so a horizontally scrolled grid kept the checkbox and lost the
		// chevron of the very same row.
		expect(sideOf(EXPAND_COLUMN_ID)).toBe('left')
		expect(sideOf(ACTIONS_COLUMN_ID)).toBe('right')
	})
})

describe('SystemColumnDef', () => {
	it('labels the actions column, which had no route to a header at all', () => {
		const table = createTable<Row>({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: noop },
			rowActions: { column: { header: 'Actions' } },
		})

		expect(table.getColumn(ACTIONS_COLUMN_ID)?.columnDef.meta?.systemHeader).toBe('Actions')
	})

	it('takes the scalar and object width forms a normal column takes', () => {
		const table = createTable<Row>({
			data: DATA,
			columns: COLUMNS,
			selection: { column: { width: 60 } },
			expanding: { column: { width: { default: 72, min: 48, max: 96 } } },
		})

		const selection = table.getColumn(SELECTION_COLUMN_ID)?.columnDef
		const expand = table.getColumn(EXPAND_COLUMN_ID)?.columnDef

		expect(selection?.size).toBe(60)
		expect(expand?.size).toBe(72)
		expect(expand?.minSize).toBe(48)
		expect(expand?.maxSize).toBe(96)
	})

	it('unpins the actions column on request — the narrow-grid case', () => {
		const table = createTable<Row>({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: noop },
			rowActions: { column: { pinning: false } },
		})

		expect(table.getColumn(ACTIONS_COLUMN_ID)?.columnDef.meta?.pinning).toBe(false)
		expect(table.getState().columnPinning.right ?? []).not.toContain(ACTIONS_COLUMN_ID)
	})

	it('normalizes the scalar align form the way a normal column does', () => {
		const table = createTable<Row>({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: noop },
			rowActions: { column: { align: 'center' } },
		})

		expect(table.getColumn(ACTIONS_COLUMN_ID)?.columnDef.meta?.align).toEqual({
			header: 'center',
			cell: 'center',
			footer: 'center',
		})
	})

	it('carries the class names through, under the column option names', () => {
		const table = createTable<Row>({
			data: DATA,
			columns: COLUMNS,
			selection: { column: { headerClassName: 'th-pick', cellClassName: 'td-pick' } },
		})

		const meta = table.getColumn(SELECTION_COLUMN_ID)?.columnDef.meta
		expect(meta?.headerClassName).toBe('th-pick')
		expect(meta?.cellClassName).toBe('td-pick')
	})
})

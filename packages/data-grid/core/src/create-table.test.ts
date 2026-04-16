import { describe, expect, it, vi } from 'vitest'

import { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, ROW_PIN_COLUMN_ID, SELECTION_COLUMN_ID } from './system-columns'

import { createTable, defineColumns } from './index'

interface Row {
	id: number
	name: string
	age: number
}

const DATA: Row[] = [
	{ id: 1, name: 'Alice', age: 30 },
	{ id: 2, name: 'Bob', age: 25 },
]

const COLUMNS = defineColumns<Row>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age' },
])

// ── helpers ───────────────────────────────────────────────────────────────────

const columnIds = (table: ReturnType<typeof createTable<Row>>) => table.getAllColumns().map((c) => c.id)

// ── sorting ───────────────────────────────────────────────────────────────────

describe('createTable — sorting', () => {
	it('sorting: true enables getSortedRowModel', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: true })
		expect(table.options.getSortedRowModel).toBeDefined()
	})

	it('sorting not set — getSortedRowModel is undefined', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.getSortedRowModel).toBeUndefined()
	})

	it('sorting: { manual: true } sets manualSorting', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { manual: true } })
		expect(table.options.manualSorting).toBe(true)
	})

	it('sorting: true does not set manualSorting', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: true })
		expect(table.options.manualSorting).toBeFalsy()
	})
})

// ── filtering ─────────────────────────────────────────────────────────────────

describe('createTable — filtering', () => {
	it('filtering: true enables getFilteredRowModel', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, filtering: true })
		expect(table.options.getFilteredRowModel).toBeDefined()
	})

	it('filtering not set — getFilteredRowModel is undefined', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.getFilteredRowModel).toBeUndefined()
	})

	it('filtering: { manual: true } sets manualFiltering', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, filtering: { manual: true } })
		expect(table.options.manualFiltering).toBe(true)
	})
})

// ── pagination ────────────────────────────────────────────────────────────────

describe('createTable — pagination', () => {
	it('pagination: true enables getPaginationRowModel', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pagination: true })
		expect(table.options.getPaginationRowModel).toBeDefined()
	})

	it('pagination not set — getPaginationRowModel is undefined', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.getPaginationRowModel).toBeUndefined()
	})

	it('pagination: true uses default pageSize of 10', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pagination: true })
		expect(table.getState().pagination.pageSize).toBe(10)
	})

	it('pagination: { pageSize: 5 } sets initial pageSize', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pagination: { pageSize: 5 } })
		expect(table.getState().pagination.pageSize).toBe(5)
	})

	it('pagination: { manual: true, pageCount: 42 } sets manualPagination and pageCount', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			pagination: { manual: true, pageCount: 42 },
		})
		expect(table.options.manualPagination).toBe(true)
		expect(table.options.pageCount).toBe(42)
	})

	it('pagination: { manual: true } without pageCount defaults pageCount to -1', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pagination: { manual: true } })
		expect(table.options.pageCount).toBe(-1)
	})
})

// ── selection ─────────────────────────────────────────────────────────────────

describe('createTable — selection', () => {
	it('selection: true enables enableRowSelection', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, selection: true })
		expect(table.options.enableRowSelection).toBe(true)
	})

	it('selection not set — enableRowSelection is false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.enableRowSelection).toBe(false)
	})

	it('selection: { onChange } fires callback with selected row ids', () => {
		const onChange = vi.fn()
		const table = createTable({ data: DATA, columns: COLUMNS, selection: { onChange } })
		// Select first row
		table.getRow('1').toggleSelected(true)
		expect(onChange).toHaveBeenCalledWith(['1'])
	})
})

// ── expanding ─────────────────────────────────────────────────────────────────

describe('createTable — expanding', () => {
	it('expanding: true enables getExpandedRowModel and getGroupedRowModel', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, expanding: true })
		expect(table.options.getExpandedRowModel).toBeDefined()
		expect(table.options.getGroupedRowModel).toBeDefined()
	})

	it('expanding not set — getExpandedRowModel is undefined', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.getExpandedRowModel).toBeUndefined()
	})
})

// ── row pinning ───────────────────────────────────────────────────────────────

describe('createTable — pinning', () => {
	it('pinning: { row: { top: true } } enables enableRowPinning', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: { row: { top: true } } })
		expect(table.options.enableRowPinning).toBe(true)
	})

	it('pinning: { row: { bottom: true } } enables enableRowPinning', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: { row: { bottom: true } } })
		expect(table.options.enableRowPinning).toBe(true)
	})

	it('pinning: { row: { top: true, bottom: true } } sets keepPinnedRows to false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: { row: { top: true, bottom: true } } })
		expect(table.options.keepPinnedRows).toBe(false)
	})

	it('pinning: true enables enableRowPinning (top+bottom)', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: true })
		expect(table.options.enableRowPinning).toBe(true)
	})

	it('pinning: { row: true } enables enableRowPinning (top+bottom)', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: { row: true } })
		expect(table.options.enableRowPinning).toBe(true)
	})

	it('pinning: { column: true } does NOT enable row pinning', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: { column: true } })
		expect(table.options.enableRowPinning).toBeFalsy()
	})

	it('pinning not set — enableRowPinning is falsy', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.enableRowPinning).toBeFalsy()
	})

	it('pinning: {} (neither row nor column) does not enable row pinning', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: {} })
		expect(table.options.enableRowPinning).toBeFalsy()
	})
})

// ── creating / editing / deleting ─────────────────────────────────────────────

describe('createTable — creating / editing / deleting', () => {
	it('creating config is stored in table options', () => {
		const cfg = { onSave: () => true as const }
		const table = createTable({ data: DATA, columns: COLUMNS, creating: cfg })
		expect(table.options.creating).toBe(cfg)
	})

	it('editing config is stored in table options', () => {
		const cfg = { mode: 'row' as const, onSave: () => true as const }
		const table = createTable({ data: DATA, columns: COLUMNS, editing: cfg })
		expect(table.options.editing).toBe(cfg)
	})

	it('deleting config is stored in table options', () => {
		const cfg = { onDelete: () => {} }
		const table = createTable({ data: DATA, columns: COLUMNS, deleting: cfg })
		expect(table.options.deleting).toBe(cfg)
	})

	it('creating not set — options.creating is undefined', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.creating).toBeUndefined()
	})
})

// ── loading ───────────────────────────────────────────────────────────────────

describe('createTable — loading', () => {
	it('loading: true sets initial isLoading to true', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, loading: true })
		expect(table.getIsLoading()).toBe(true)
	})

	it('loading not set — getIsLoading() returns false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.getIsLoading()).toBe(false)
	})
})

// ── system columns ────────────────────────────────────────────────────────────

describe('createTable — system columns', () => {
	it('no features → only user columns are present', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		const ids = columnIds(table)
		expect(ids).toEqual(['name', 'age'])
	})

	it('selection: true prepends __selection__ column', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, selection: true })
		expect(columnIds(table)[0]).toBe(SELECTION_COLUMN_ID)
	})

	it('expanding: true prepends __expand__ column after __selection__', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, selection: true, expanding: true })
		const ids = columnIds(table)
		expect(ids[0]).toBe(SELECTION_COLUMN_ID)
		expect(ids[1]).toBe(EXPAND_COLUMN_ID)
	})

	it('editing: true appends __actions__ column after user columns', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, editing: { mode: 'row', onSave: () => true } })
		const ids = columnIds(table)
		expect(ids.at(-1)).toBe(ACTIONS_COLUMN_ID)
	})

	it('deleting: true appends __actions__ column after user columns', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, deleting: { onDelete: () => {} } })
		const ids = columnIds(table)
		expect(ids.at(-1)).toBe(ACTIONS_COLUMN_ID)
	})

	it('pinning: { row: { top: true } } appends __row_pin__ column last', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: { row: { top: true } } })
		const ids = columnIds(table)
		expect(ids.at(-1)).toBe(ROW_PIN_COLUMN_ID)
	})

	it('__row_pin__ comes after __actions__ when both editing and pinning are enabled', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'row', onSave: () => true },
			pinning: { row: { top: true } },
		})
		const ids = columnIds(table)
		const actionsIdx = ids.indexOf(ACTIONS_COLUMN_ID)
		const pinIdx = ids.indexOf(ROW_PIN_COLUMN_ID)
		expect(actionsIdx).toBeGreaterThan(-1)
		expect(pinIdx).toBe(actionsIdx + 1)
	})

	it('full column order: __selection__, __expand__, user cols, __actions__, __row_pin__', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			selection: true,
			expanding: true,
			editing: { mode: 'row', onSave: () => true },
			pinning: { row: { top: true } },
		})
		expect(columnIds(table)).toEqual([
			SELECTION_COLUMN_ID,
			EXPAND_COLUMN_ID,
			'name',
			'age',
			ACTIONS_COLUMN_ID,
			ROW_PIN_COLUMN_ID,
		])
	})

	it('system columns have isSystemColumn: true in meta', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			selection: true,
			pinning: { row: { top: true } },
		})
		const selCol = table.getColumn(SELECTION_COLUMN_ID)
		const pinCol = table.getColumn(ROW_PIN_COLUMN_ID)
		expect(selCol?.columnDef.meta?.isSystemColumn).toBe(true)
		expect(pinCol?.columnDef.meta?.isSystemColumn).toBe(true)
	})

	it('__actions__ column has columnPinning: { pin: "right" } in meta', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'row', onSave: () => true },
		})
		const actionsCol = table.getColumn(ACTIONS_COLUMN_ID)
		expect(actionsCol?.columnDef.meta?.columnPinning).toEqual({ pin: 'right' })
	})
})

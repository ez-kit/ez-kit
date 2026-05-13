import { describe, expect, it, vi } from 'vitest'

import { createTable, defineColumns } from '../index'
import { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, ROW_PIN_COLUMN_ID, SELECTION_COLUMN_ID } from '../system-columns'


type Row = {
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

	it('sorting.initial seeds initialState.sorting and current state', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			sorting: { initial: [{ id: 'name', desc: true }] },
		})
		expect(table.initialState.sorting).toEqual([{ id: 'name', desc: true }])
		expect(table.getState().sorting).toEqual([{ id: 'name', desc: true }])
	})

	it('sorting.descFirst → sortDescFirst', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { descFirst: true } })
		expect(table.options.sortDescFirst).toBe(true)
	})

	it('sorting.removable: false → enableSortingRemoval: false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { removable: false } })
		expect(table.options.enableSortingRemoval).toBe(false)
	})

	it('sorting.removable not set — enableSortingRemoval untouched', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: true })
		expect(table.options.enableSortingRemoval).toBeUndefined()
	})

	it('sorting.multi: true → enableMultiSort: true', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { multi: true } })
		expect(table.options.enableMultiSort).toBe(true)
	})

	it('sorting.multi: false → enableMultiSort: false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { multi: false } })
		expect(table.options.enableMultiSort).toBe(false)
	})

	it('sorting.multi: { max: 3 } → enableMultiSort + maxMultiSortColCount', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { multi: { max: 3 } } })
		expect(table.options.enableMultiSort).toBe(true)
		expect(table.options.maxMultiSortColCount).toBe(3)
	})

	it('sorting.multi: { removable: false } → enableMultiRemove: false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { multi: { removable: false } } })
		expect(table.options.enableMultiRemove).toBe(false)
	})

	it("sorting.multi: { event: 'always' } → isMultiSortEvent always true", () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { multi: { event: 'always' } } })
		const fn = table.options.isMultiSortEvent
		expect(fn).toBeTypeOf('function')
		expect(fn?.({})).toBe(true)
	})

	it("sorting.multi: { event: 'ctrl' } → isMultiSortEvent fires for ctrlKey/metaKey", () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { multi: { event: 'ctrl' } } })
		const fn = table.options.isMultiSortEvent
		expect(fn).toBeTypeOf('function')
		expect(fn?.({ ctrlKey: true })).toBe(true)
		expect(fn?.({ metaKey: true })).toBe(true)
		expect(fn?.({ shiftKey: true })).toBe(false)
	})

	it("sorting.multi: { event: 'shift' } → uses TanStack default (shift-key gated)", () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { multi: { event: 'shift' } } })
		const fn = table.options.isMultiSortEvent
		expect(fn).toBeTypeOf('function')
		expect(fn?.({ shiftKey: true })).toBe(true)
		expect(fn?.({ ctrlKey: true })).toBeFalsy()
	})

	it('sorting.fns → sortingFns registry', () => {
		const fns = { byLength: (a: unknown, b: unknown, id: string) => {
			const av = String((a as { getValue: (k: string) => unknown }).getValue(id) ?? '')
			const bv = String((b as { getValue: (k: string) => unknown }).getValue(id) ?? '')
			return av.length - bv.length
		} }
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { fns } })
		expect((table.options as unknown as { sortingFns?: typeof fns }).sortingFns).toBe(fns)
	})

	it('sorting.onChange fires when sort changes via setSorting', () => {
		const onChange = vi.fn()
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { onChange } })
		table.setSorting([{ id: 'name', desc: false }])
		expect(onChange).toHaveBeenCalledWith([{ id: 'name', desc: false }])
	})

	it('sorting.onChange not fired when other state mutates', () => {
		const onChange = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			sorting: { onChange },
			selection: true,
		})
		table.getRow('1').toggleSelected(true)
		expect(onChange).not.toHaveBeenCalled()
	})

	it('sorting.toolbar is a UI-only flag, no TanStack option leaks', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { toolbar: true } })
		// Just verify it doesn't crash and getSortedRowModel is enabled.
		expect(table.options.getSortedRowModel).toBeDefined()
		expect((table.options as unknown as { toolbar?: unknown }).toolbar).toBeUndefined()
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

	it('filtering: true without globalFiltering disables global filter', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, filtering: true })
		expect(table.options.enableGlobalFilter).toBe(false)
	})
})

// ── global filtering ──────────────────────────────────────────────────────────

describe('createTable — globalFiltering', () => {
	it('globalFiltering: true enables getFilteredRowModel and leaves enableGlobalFilter on', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, globalFiltering: true })
		expect(table.options.getFilteredRowModel).toBeDefined()
		expect(table.options.enableGlobalFilter).toBeUndefined()
	})

	it('globalFiltering: true without filtering disables column filters', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, globalFiltering: true })
		expect(table.options.enableColumnFilters).toBe(false)
	})

	it('globalFiltering not set — getFilteredRowModel undefined and enableGlobalFilter: false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.getFilteredRowModel).toBeUndefined()
		expect(table.options.enableGlobalFilter).toBe(false)
	})

	it('filtering + globalFiltering both truthy — both axes enabled', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, filtering: true, globalFiltering: true })
		expect(table.options.getFilteredRowModel).toBeDefined()
		expect(table.options.enableColumnFilters).toBeUndefined()
		expect(table.options.enableGlobalFilter).toBeUndefined()
	})

	it('globalFiltering with inline fn passes function to globalFilterFn', () => {
		const fn = vi.fn(() => true)
		const table = createTable({ data: DATA, columns: COLUMNS, globalFiltering: { fn } })
		expect(table.options.globalFilterFn).toBe(fn)
	})

	it('globalFiltering with string fn that matches registry passes registry fn', () => {
		const fuzzy = vi.fn(() => true)
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			globalFiltering: { fn: 'fuzzy', fns: { fuzzy } },
		})
		expect(table.options.globalFilterFn).toBe(fuzzy)
	})

	it('globalFiltering with string fn that has no registry match passes string through to TanStack', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			globalFiltering: { fn: 'includesString' },
		})
		expect(table.options.globalFilterFn).toBe('includesString')
	})

	it("globalFiltering: true with no fn — defaults to 'includesString'", () => {
		const table = createTable({ data: DATA, columns: COLUMNS, globalFiltering: true })
		expect(table.options.globalFilterFn).toBe('includesString')
	})

	it('column.globalFilter: false disables the column for global search', () => {
		const table = createTable({
			data: DATA,
			columns: [
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'age', header: 'Age', globalFilter: false },
			],
			globalFiltering: true,
		})
		const ageCol = table.getColumn('age')
		expect(ageCol?.columnDef.enableGlobalFilter).toBe(false)
	})

	it('global search actually filters rows when enabled', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, globalFiltering: true })
		table.setGlobalFilter('alice')
		expect(table.getFilteredRowModel().rows).toHaveLength(1)
		expect(table.getFilteredRowModel().rows[0]?.getValue('name')).toBe('Alice')
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
	it('expanding: true enables getExpandedRowModel', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, expanding: true })
		expect(table.options.getExpandedRowModel).toBeDefined()
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
		const cfg = { onSave: () => Promise.resolve() }
		const table = createTable({ data: DATA, columns: COLUMNS, creating: cfg })
		expect(table.options.creating).toBe(cfg)
	})

	it('editing config is stored in table options', () => {
		const cfg = { mode: 'row' as const, onSave: () => Promise.resolve() }
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
		const table = createTable({ data: DATA, columns: COLUMNS, editing: { mode: 'row', onSave: () => Promise.resolve() } })
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
			editing: { mode: 'row', onSave: () => Promise.resolve() },
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
			editing: { mode: 'row', onSave: () => Promise.resolve() },
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
			editing: { mode: 'row', onSave: () => Promise.resolve() },
		})
		const actionsCol = table.getColumn(ACTIONS_COLUMN_ID)
		expect(actionsCol?.columnDef.meta?.columnPinning).toEqual({ pin: 'right' })
	})
})

// ── virtualized ───────────────────────────────────────────────────────────────

describe('createTable — virtualized', () => {
	it('virtualized not set — options.virtualized is undefined', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect((table.options as unknown as { virtualized?: unknown }).virtualized).toBeUndefined()
	})

	it('virtualized: true — stored on options', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, virtualized: true })
		expect((table.options as unknown as { virtualized?: unknown }).virtualized).toBe(true)
	})

	it('virtualized: { row: true } — stored on options', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, virtualized: { row: true } })
		expect((table.options as unknown as { virtualized?: unknown }).virtualized).toEqual({ row: true })
	})

	it('virtualized: { row: { overscan: 10 } } — stored on options with custom options', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, virtualized: { row: { overscan: 10 } } })
		expect((table.options as unknown as { virtualized?: unknown }).virtualized).toEqual({ row: { overscan: 10 } })
	})

	it('virtualized: { row: { estimateSize: () => 64 } } — stored on options with custom estimateSize', () => {
		const estimateSize = () => 64
		const table = createTable({ data: DATA, columns: COLUMNS, virtualized: { row: { estimateSize } } })
		expect((table.options as unknown as { virtualized?: unknown }).virtualized).toEqual({ row: { estimateSize } })
	})
})

// ── subscribe / setData ────────────────────────────────────────────────────────

describe('createTable — subscribe / setData', () => {
	it('subscribe listener fires when row selection changes', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, selection: true })
		const listener = vi.fn()
		const unsub = table.subscribe(listener)
		table.getRow('1').toggleSelected(true)
		expect(listener).toHaveBeenCalled()
		unsub()
	})

	it('setData fires subscribe listener', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		const listener = vi.fn()
		const unsub = table.subscribe(listener)
		table.setData([{ id: 3, name: 'Carol', age: 28 }])
		expect(listener).toHaveBeenCalled()
		unsub()
	})

	it('getSnapshot returns a new reference after setData', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		const snapshotBefore = table.getSnapshot()
		table.setData([{ id: 3, name: 'Carol', age: 28 }])
		const snapshotAfter = table.getSnapshot()
		// Must be a different reference so useSyncExternalStore triggers re-render
		expect(snapshotAfter).not.toBe(snapshotBefore)
	})

	it('getSnapshot returns a new reference after row selection changes', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, selection: true })
		const snapshotBefore = table.getSnapshot()
		table.getRow('1').toggleSelected(true)
		const snapshotAfter = table.getSnapshot()
		expect(snapshotAfter).not.toBe(snapshotBefore)
	})

	it('table data updates after setData', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		table.setData([{ id: 3, name: 'Carol', age: 28 }])
		expect(table.getRowModel().rows).toHaveLength(1)
		expect(table.getRowModel().rows[0]?.getValue('name')).toBe('Carol')
	})
})

// ── table-level off semantics ─────────────────────────────────────────────────
// Falsy table-level config (undefined or false) must fully disable a feature for
// every user column, overriding TanStack's per-column defaults. Truthy config
// (true or object) restores the default and lets per-column overrides apply.

const userColumns = (table: ReturnType<typeof createTable<Row>>) =>
	table.getAllColumns().filter((c) => !c.columnDef.meta?.isSystemColumn)

describe('createTable — table-level off: sorting', () => {
	it('sorting undefined → enableSorting: false, all user columns getCanSort() = false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.enableSorting).toBe(false)
		expect(userColumns(table).every((c) => !c.getCanSort())).toBe(true)
	})

	it('sorting: false → enableSorting: false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: false })
		expect(table.options.enableSorting).toBe(false)
		expect(userColumns(table).every((c) => !c.getCanSort())).toBe(true)
	})

	it('sorting: true → enableSorting untouched, user columns can sort', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: true })
		expect(table.options.enableSorting).toBeUndefined()
		expect(userColumns(table).every((c) => c.getCanSort())).toBe(true)
	})
})

describe('createTable — table-level off: filtering', () => {
	it('filtering undefined → enableColumnFilters: false, all user columns getCanFilter() = false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.enableColumnFilters).toBe(false)
		expect(userColumns(table).every((c) => !c.getCanFilter())).toBe(true)
	})

	it('filtering: false → enableColumnFilters: false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, filtering: false })
		expect(table.options.enableColumnFilters).toBe(false)
	})

	it('filtering: true → enableColumnFilters untouched, user columns can filter', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, filtering: true })
		expect(table.options.enableColumnFilters).toBeUndefined()
		expect(userColumns(table).every((c) => c.getCanFilter())).toBe(true)
	})
})

describe('createTable — table-level off: columnVisibility', () => {
	it('columnVisibility undefined → enableHiding: false, all user columns getCanHide() = false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.enableHiding).toBe(false)
		expect(userColumns(table).every((c) => !c.getCanHide())).toBe(true)
	})

	it('columnVisibility: false → enableHiding: false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, columnVisibility: false })
		expect(table.options.enableHiding).toBe(false)
	})

	it('columnVisibility: true → enableHiding untouched, user columns can hide', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, columnVisibility: true })
		expect(table.options.enableHiding).toBeUndefined()
		expect(userColumns(table).every((c) => c.getCanHide())).toBe(true)
	})
})

describe('createTable — table-level off: column pinning', () => {
	it('pinning undefined → enableColumnPinning: false, user columns getCanPin() = false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.enableColumnPinning).toBe(false)
		expect(userColumns(table).every((c) => !c.getCanPin())).toBe(true)
	})

	it('pinning: false → enableColumnPinning: false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: false })
		expect(table.options.enableColumnPinning).toBe(false)
	})

	it('pinning: { column: true } → enableColumnPinning untouched, user columns can pin', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: { column: true } })
		expect(table.options.enableColumnPinning).toBeUndefined()
		expect(userColumns(table).every((c) => c.getCanPin())).toBe(true)
	})

	it('pinning: { row: { top: true } } → column pinning stays disabled', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: { row: { top: true } } })
		expect(table.options.enableColumnPinning).toBe(false)
	})
})

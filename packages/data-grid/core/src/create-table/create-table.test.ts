import { describe, expect, it, vi } from 'vitest'

import { createTable, createColumns } from '../index'
import { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, SELECTION_COLUMN_ID } from '../system-columns'

type Row = {
	id: number
	name: string
	age: number
}

const DATA: Row[] = [
	{ id: 1, name: 'Alice', age: 30 },
	{ id: 2, name: 'Bob', age: 25 },
]

const COLUMNS = createColumns<Row>([
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

	it('initialState.sorting seeds initialState.sorting and current state', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			sorting: true,
			initialState: { sorting: [{ id: 'name', desc: true }] },
		})
		expect(table.initialState.sorting).toEqual([{ id: 'name', desc: true }])
		expect(table.getState().sorting).toEqual([{ id: 'name', desc: true }])
	})

	// `initialState` merges into the pagination slice instead of replacing it. Spreading the
	// consumer seed over a whole `pagination` default used to wipe the sibling key, so a deep
	// link that seeds only `pageIndex` left `pageSize` undefined and the first page rendered
	// with no size at all.
	it('initialState.pagination seeds one key without dropping the other', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			pagination: { pageSize: 25 },
			initialState: { pagination: { pageIndex: 3 } },
		})
		expect(table.initialState.pagination).toEqual({ pageIndex: 3, pageSize: 25 })
		expect(table.getState().pagination).toEqual({ pageIndex: 3, pageSize: 25 })
	})

	it('initialState.pagination can override the configured pageSize', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			pagination: { pageSize: 25 },
			initialState: { pagination: { pageIndex: 0, pageSize: 50 } },
		})
		expect(table.getState().pagination).toEqual({ pageIndex: 0, pageSize: 50 })
	})

	it('sorting.descFirst → sortDescFirst', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { descFirst: true } })
		expect(table.options.sortDescFirst).toBe(true)
	})

	it('sorting.clearable: false → enableSortingRemoval: false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { clearable: false } })
		expect(table.options.enableSortingRemoval).toBe(false)
	})

	it('sorting.clearable not set — enableSortingRemoval untouched', () => {
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
		const fns = {
			byLength: (a: unknown, b: unknown, id: string) => {
				const av = String((a as { getValue: (k: string) => unknown }).getValue(id) ?? '')
				const bv = String((b as { getValue: (k: string) => unknown }).getValue(id) ?? '')
				return av.length - bv.length
			},
		}
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

	it('column.globalFiltering: false disables the column for global search', () => {
		const table = createTable({
			data: DATA,
			columns: [
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'age', header: 'Age', globalFiltering: false },
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

	it('globalFiltering: { manual: true } sets manualFiltering', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, globalFiltering: { manual: true } })
		expect(table.options.manualFiltering).toBe(true)
	})

	it('globalFiltering: { manual: true } leaves rows untouched by client-side global search', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, globalFiltering: { manual: true } })
		table.setGlobalFilter('alice')
		expect(table.getFilteredRowModel().rows).toHaveLength(DATA.length)
	})

	it('filtering: { manual: true } also stops client-side global search', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			filtering: { manual: true },
			globalFiltering: true,
		})
		table.setGlobalFilter('alice')
		expect(table.options.manualFiltering).toBe(true)
		expect(table.getFilteredRowModel().rows).toHaveLength(DATA.length)
	})

	it('globalFiltering without manual still filters client-side', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, globalFiltering: { onChange: vi.fn() } })
		table.setGlobalFilter('alice')
		expect(table.options.manualFiltering).toBeUndefined()
		expect(table.getFilteredRowModel().rows).toHaveLength(1)
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

	it('pagination: { manual: true, rowCount: 100, pageSize: 10 } derives pageCount via TanStack', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			pagination: { manual: true, pageSize: 10, rowCount: 100 },
		})
		expect(table.options.manualPagination).toBe(true)
		expect(table.options.rowCount).toBe(100)
		// TanStack derives pageCount = ceil(rowCount / pageSize) = 10
		expect(table.getPageCount()).toBe(10)
	})

	it('pagination: { manual: true, rowCount: 95, pageSize: 10 } rounds up derived pageCount', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			pagination: { manual: true, pageSize: 10, rowCount: 95 },
		})
		// TanStack derives pageCount = ceil(95 / 10) = 10
		expect(table.getPageCount()).toBe(10)
	})

	it('pagination: { manual: true, rowCount: 100 } exposes rowCount via getRowCount()', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			pagination: { manual: true, pageSize: 10, rowCount: 100 },
		})
		expect(table.getRowCount()).toBe(100)
	})

	it('pagination: { manual: true, pageCount: 5 } with no rowCount leaves rowCount unset', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			pagination: { manual: true, pageCount: 5 },
		})
		expect(table.options.rowCount).toBeUndefined()
		expect(table.getPageCount()).toBe(5)
	})
})

// ── selection ─────────────────────────────────────────────────────────────────

describe('createTable — unreachable seeds', () => {
	// The seed is NOT dropped: it is what the author wrote, and silently ignoring config is
	// worse than honouring it. But with the feature off there is no affordance to undo it, so
	// the grid says so in development instead of leaving it silent.
	it('visibility.initialHidden still applies when the table feature is off', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const table = createTable({
			data: DATA,
			columns: createColumns<Row>([
				{ accessorKey: 'name' },
				{ accessorKey: 'age', visibility: { initialHidden: true } },
			]),
		})
		expect(table.getState().columnVisibility).toEqual({ age: false })
		expect(table.getColumn('age')?.getCanHide()).toBe(false)
		warn.mockRestore()
	})

	it('warns when visibility.initialHidden has no feature to undo it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		createTable({
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'age', visibility: { initialHidden: true } }]),
		})
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0]?.[0]).toContain('visibility.initialHidden')
		expect(warn.mock.calls[0]?.[0]).toContain('age')
		warn.mockRestore()
	})

	it('does not warn when the visibility feature is on', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		createTable({
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'age', visibility: { initialHidden: true } }]),
			visibility: true,
		})
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})

	it('warns when pinning.initialSide has no column menu to undo it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		createTable({
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'age', pinning: { initialSide: 'left' } }]),
		})
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0]?.[0]).toContain('pinning.initialSide')
		warn.mockRestore()
	})

	// A static pin is meant to be unchangeable, so it has nothing to warn about.
	it('does not warn for a static pin', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		createTable({ data: DATA, columns: createColumns<Row>([{ accessorKey: 'age', pinning: 'left' }]) })
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})

	it('does not warn when the pinning feature is on', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		createTable({
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'age', pinning: { initialSide: 'left' } }]),
			pinning: { column: true },
		})
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})

describe('createTable — selection', () => {
	it('selection: true enables enableRowSelection', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, selection: true })
		expect(table.options.enableRowSelection).toBe(true)
	})

	it('selection not set — enableRowSelection is false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.enableRowSelection).toBe(false)
	})

	it('selection: { onChange } fires with the slice first, then the selected ids', () => {
		const onChange = vi.fn()
		const table = createTable({ data: DATA, columns: COLUMNS, selection: { onChange } })
		table.getRow('1').toggleSelected(true)
		expect(onChange).toHaveBeenCalledWith({ '1': true }, ['1'])
	})

	// The assertion this suite was missing. `selection.onChange` used to be carried by TanStack's
	// `onRowSelectionChange`, which *replaces* the built-in state writer — so supplying a callback
	// silently stopped the selection from ever being recorded, and every checkbox went dead. The
	// old test passed throughout, because it only checked that the callback fired.
	it('selection state is still recorded when onChange is supplied', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, selection: { onChange: vi.fn() } })
		table.getRow('1').toggleSelected(true)
		expect(table.getState().rowSelection).toEqual({ '1': true })
		expect(table.getRow('1').getIsSelected()).toBe(true)
	})

	// `selection.multiple` was declared, documented ("Set `false` to allow only one selected
	// row") and read by nothing at all: TanStack defaults `enableMultiRowSelection` to true, so
	// the grid kept accumulating rows. Renamed to `multi` (matching `sorting.multi`) and wired.
	it('selection: { multi: false } disables enableMultiRowSelection', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, selection: { multi: false } })
		expect(table.options.enableMultiRowSelection).toBe(false)
	})

	it('selection: { multi: false } — selecting a row replaces the previous one', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, selection: { multi: false } })
		table.getRow('1').toggleSelected(true)
		table.getRow('2').toggleSelected(true)
		expect(table.getState().rowSelection).toEqual({ '2': true })
	})

	it('selection: true — rows accumulate', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, selection: true })
		table.getRow('1').toggleSelected(true)
		table.getRow('2').toggleSelected(true)
		expect(table.getState().rowSelection).toEqual({ '1': true, '2': true })
	})
})

// ── per-feature onChange ──────────────────────────────────────────────────────

describe('createTable — per-feature onChange', () => {
	it('visibility.onChange fires with the visibility slice', () => {
		const onChange = vi.fn()
		const table = createTable({ data: DATA, columns: COLUMNS, visibility: { onChange } })
		table.getColumn('name')?.toggleVisibility(false)
		expect(onChange).toHaveBeenCalledWith({ name: false })
		expect(table.getState().columnVisibility).toEqual({ name: false })
	})

	it('pinning.column.onChange fires with the column-pinning slice', () => {
		const onChange = vi.fn()
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: { column: { onChange } } })
		table.getColumn('name')?.pin('left')
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ left: ['name'] }))
	})

	it('pinning.row.onChange fires with the row-pinning slice', () => {
		const onChange = vi.fn()
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: { row: { top: true, onChange } } })
		table.getRow('1').pin('top')
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ top: ['1'] }))
	})

	it('resizing.onChange fires with the committed column sizes', () => {
		const onChange = vi.fn()
		const table = createTable({ data: DATA, columns: COLUMNS, resizing: { onChange } })
		table.setColumnSizing({ name: 240 })
		expect(onChange).toHaveBeenCalledWith({ name: 240 })
	})

	it('expanding.onChange fires with the expanded slice', () => {
		const onChange = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			expanding: { onChange, getRowCanExpand: () => true },
		})
		table.getRow('1').toggleExpanded(true)
		expect(onChange).toHaveBeenCalledWith({ '1': true })
	})

	it('a disabled feature contributes no onChange', () => {
		const onChange = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			visibility: { enabled: false, onChange },
		})
		table.getColumn('name')?.toggleVisibility(false)
		expect(onChange).not.toHaveBeenCalled()
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

// ── loading ─────────────────────────────────────────────────────────────────

describe('createTable — loading', () => {
	it('seeds state.loading defaults (all false, error null)', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.getSnapshot().loading).toEqual({
			isPending: false,
			isFetching: false,
			isError: false,
			error: null,
		})
	})

	it('initialState.loading seeds the controlled slice', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			initialState: { loading: { isPending: true, isFetching: false, isError: false, error: null } },
		})
		expect(table.getSnapshot().loading.isPending).toBe(true)
	})
})

// ── initialState — type-level ────────────────────────────────────────────────
// `editing`, `creating` and `deleting` are transient UI
// state that each feature hard-resets on its own initialization, so seeding them is
// rejected at the type level rather than silently ignored at runtime — see
// `InitialTableState` in `../types`.

describe('createTable — initialState type constraints', () => {
	it('rejects seeding transient editing/creating/deleting slices, allows loading', () => {
		createTable({
			data: DATA,
			columns: COLUMNS,
			// @ts-expect-error — `editing` is transient per-open-form state, hard-reset by the feature
			initialState: { editing: { rowId: '1', values: {}, errors: {}, commitStatus: 'idle' } },
		})

		createTable({
			data: DATA,
			columns: COLUMNS,
			// @ts-expect-error — `creating` is transient per-open-form state, hard-reset by the feature
			initialState: { creating: { values: {}, errors: {}, commitStatus: 'idle' } },
		})

		createTable({
			data: DATA,
			columns: COLUMNS,
			// @ts-expect-error — `deleting` is transient per-dialog state, hard-reset by the feature
			initialState: { deleting: { pendingRowId: '1', pendingBulk: false } },
		})

		// `loading` still deep-merges the consumer's value, so it stays allowed.
		createTable({
			data: DATA,
			columns: COLUMNS,
			initialState: { loading: { isPending: true, isFetching: false, isError: false, error: null } },
		})
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
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'row', onSave: () => Promise.resolve() },
		})
		const ids = columnIds(table)
		expect(ids.at(-1)).toBe(ACTIONS_COLUMN_ID)
	})

	it('deleting: true appends __actions__ column after user columns', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, deleting: { onDelete: () => {} } })
		const ids = columnIds(table)
		expect(ids.at(-1)).toBe(ACTIONS_COLUMN_ID)
	})

	it('pinning: { row: { top: true } } alone appends the __actions__ column', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, pinning: { row: { top: true } } })
		const ids = columnIds(table)
		expect(ids.at(-1)).toBe(ACTIONS_COLUMN_ID)
	})

	it('editing and pinning together share a single __actions__ column', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'row', onSave: () => Promise.resolve() },
			pinning: { row: { top: true } },
		})
		const ids = columnIds(table)
		expect(ids.filter((id) => id === ACTIONS_COLUMN_ID)).toHaveLength(1)
		expect(ids.at(-1)).toBe(ACTIONS_COLUMN_ID)
	})

	it('full column order: __selection__, __expand__, user cols, __actions__', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			selection: true,
			expanding: true,
			editing: { mode: 'row', onSave: () => Promise.resolve() },
			pinning: { row: { top: true } },
		})
		expect(columnIds(table)).toEqual([SELECTION_COLUMN_ID, EXPAND_COLUMN_ID, 'name', 'age', ACTIONS_COLUMN_ID])
	})

	it('system columns have isSystemColumn: true in meta', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			selection: true,
			pinning: { row: { top: true } },
		})
		const selCol = table.getColumn(SELECTION_COLUMN_ID)
		const actionsCol = table.getColumn(ACTIONS_COLUMN_ID)
		expect(selCol?.columnDef.meta?.isSystemColumn).toBe(true)
		expect(actionsCol?.columnDef.meta?.isSystemColumn).toBe(true)
	})

	it('__actions__ column has meta.pinning: { side: "right" }', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'row', onSave: () => Promise.resolve() },
		})
		const actionsCol = table.getColumn(ACTIONS_COLUMN_ID)
		expect(actionsCol?.columnDef.meta?.pinning).toEqual({ side: 'right' })
	})
})

// ── virtualized ───────────────────────────────────────────────────────────────

describe('createTable — virtualized', () => {
	it('virtualized not set — options.virtualization is undefined', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect((table.options as unknown as { virtualization?: unknown }).virtualization).toBeUndefined()
	})

	it('virtualization: true — stored on options', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, virtualization: true })
		expect((table.options as unknown as { virtualization?: unknown }).virtualization).toBe(true)
	})

	it('virtualization: { row: true } — stored on options', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, virtualization: { row: true } })
		expect((table.options as unknown as { virtualization?: unknown }).virtualization).toEqual({ row: true })
	})

	it('virtualization: { row: { overscan: 10 } } — stored on options with custom options', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, virtualization: { row: { overscan: 10 } } })
		expect((table.options as unknown as { virtualization?: unknown }).virtualization).toEqual({ row: { overscan: 10 } })
	})

	it('virtualization: { row: { estimateSize: () => 64 } } — stored on options with custom estimateSize', () => {
		const estimateSize = () => 64
		const table = createTable({ data: DATA, columns: COLUMNS, virtualization: { row: { estimateSize } } })
		expect((table.options as unknown as { virtualization?: unknown }).virtualization).toEqual({ row: { estimateSize } })
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

describe('createTable — table-level off: visibility', () => {
	it('visibility undefined → enableHiding: false, all user columns getCanHide() = false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.options.enableHiding).toBe(false)
		expect(userColumns(table).every((c) => !c.getCanHide())).toBe(true)
	})

	it('visibility: false → enableHiding: false', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, visibility: false })
		expect(table.options.enableHiding).toBe(false)
	})

	it('visibility: true → enableHiding untouched, user columns can hide', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, visibility: true })
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

describe('createTable — faceted', () => {
	it('without filtering.faceted, column.getFacetedUniqueValues returns an empty map', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, filtering: true })
		const nameCol = table.getColumn('name')
		if (!nameCol) throw new Error('expected name column')
		const facets = nameCol.getFacetedUniqueValues()
		expect(facets instanceof Map).toBe(true)
		expect(facets.size).toBe(0)
	})

	it('filtering: { faceted: true } populates facets with unique values + counts', () => {
		const table = createTable({
			data: [...DATA, { id: 3, name: 'Alice', age: 28 }],
			columns: COLUMNS,
			filtering: { faceted: true },
		})
		const nameCol = table.getColumn('name')
		if (!nameCol) throw new Error('expected name column')
		const facets = nameCol.getFacetedUniqueValues()
		expect(facets.get('Alice')).toBe(2)
		expect(facets.get('Bob')).toBe(1)
	})

	it('column-level faceted opt-in works even when table-level flag is off', () => {
		const COLUMNS_WITH_FACET = createColumns<Row>([
			{ accessorKey: 'name', header: 'Name', filtering: { faceted: true } },
			{ accessorKey: 'age', header: 'Age' },
		])
		const table = createTable({
			data: [...DATA, { id: 3, name: 'Alice', age: 28 }],
			columns: COLUMNS_WITH_FACET,
			filtering: true,
		})
		const nameCol = table.getColumn('name')
		if (!nameCol) throw new Error('expected name column')
		expect(nameCol.getFacetedUniqueValues().get('Alice')).toBe(2)
	})
})

// ── initial state × column-derived defaults ───────────────────────────────────

describe('createTable — initialState vs column-derived state', () => {
	const PINNED_COLUMNS = createColumns<Row>([
		{ accessorKey: 'name', header: 'Name', pinning: { side: 'left' } },
		{ accessorKey: 'age', header: 'Age' },
	])

	const DEFAULT_PINNED_COLUMNS = createColumns<Row>([
		{ accessorKey: 'name', header: 'Name', pinning: { initialSide: 'left' } },
		{ accessorKey: 'age', header: 'Age' },
	])

	const HIDDEN_COLUMNS = createColumns<Row>([
		{ accessorKey: 'name', header: 'Name', visibility: { initialHidden: true } },
		{ accessorKey: 'age', header: 'Age' },
	])

	it('column initialSide seeds columnPinning', () => {
		const table = createTable({ data: DATA, columns: DEFAULT_PINNED_COLUMNS, pinning: { column: true } })
		expect(table.getState().columnPinning.left).toContain('name')
	})

	it('consumer initialState.columnPinning wins over a initialSide it mentions', () => {
		const table = createTable({
			data: DATA,
			columns: DEFAULT_PINNED_COLUMNS,
			pinning: { column: true },
			initialState: { columnPinning: { left: [], right: ['name'] } },
		})
		expect(table.getState().columnPinning.left).not.toContain('name')
		expect(table.getState().columnPinning.right).toContain('name')
	})

	it('a initialSide the consumer never mentions keeps its seed', () => {
		const table = createTable({
			data: DATA,
			columns: DEFAULT_PINNED_COLUMNS,
			pinning: { column: true },
			initialState: { columnPinning: { left: ['age'], right: [] } },
		})
		expect(table.getState().columnPinning.left).toEqual(['name', 'age'])
	})

	it('a static pin survives an initialState.columnPinning that omits it', () => {
		const table = createTable({
			data: DATA,
			columns: PINNED_COLUMNS,
			pinning: { column: true },
			initialState: { columnPinning: { left: ['age'], right: [] } },
		})
		expect(table.getState().columnPinning.left).toContain('name')
	})

	it('initialState.columnPinning does not drop system column pins', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete: () => {} },
			initialState: { columnPinning: { left: [], right: [] } },
		})
		const { left, right } = table.getState().columnPinning
		expect(left).toContain(SELECTION_COLUMN_ID)
		expect(right).toContain(ACTIONS_COLUMN_ID)
	})

	it('initialState cannot hide a system column', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: () => {} },
			visibility: true,
			initialState: { columnVisibility: { [ACTIONS_COLUMN_ID]: false } },
		})
		expect(table.getVisibleLeafColumns().map((c) => c.id)).toContain(ACTIONS_COLUMN_ID)
	})

	it('syncControlledState cannot hide a system column', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: () => {} },
			visibility: true,
		})
		table.syncControlledState({ columnVisibility: { [ACTIONS_COLUMN_ID]: false } })
		expect(table.getVisibleLeafColumns().map((c) => c.id)).toContain(ACTIONS_COLUMN_ID)
	})

	it('setState cannot unpin a system column', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, selection: true, deleting: { onDelete: () => {} } })
		table.setState((prev) => ({ ...prev, columnPinning: { left: [], right: [] } }))
		const { left, right } = table.getState().columnPinning
		expect(left).toContain(SELECTION_COLUMN_ID)
		expect(right).toContain(ACTIONS_COLUMN_ID)
	})

	it('columnVisibility merges per key — a initialHidden column stays hidden', () => {
		const table = createTable({
			data: DATA,
			columns: HIDDEN_COLUMNS,
			visibility: true,
			initialState: { columnVisibility: { age: true } },
		})
		expect(table.getState().columnVisibility).toMatchObject({ name: false, age: true })
	})
})

describe('createTable — enabled: false', () => {
	const DATA = [{ name: 'Alice', age: 30 }]
	const COLUMNS = createColumns<{ name: string; age: number }>([{ accessorKey: 'name' }, { accessorKey: 'age' }])

	it('sorting: { enabled: false } disables sorting despite the config object', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, sorting: { enabled: false, multi: true } })
		expect(table.options.enableSorting).toBe(false)
	})

	it('a disabled feature does not contribute its manual flag', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, filtering: { enabled: false, manual: true } })
		expect(table.options.manualFiltering).toBeUndefined()
	})

	it('a disabled feature does not contribute its onChange', () => {
		const onChange = vi.fn()
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			selection: { enabled: false, onChange },
		})
		table.setState((prev) => ({ ...prev, rowSelection: { '0': true } }))
		expect(onChange).not.toHaveBeenCalled()
	})

	it('editing: { enabled: false } keeps the actions column out of the table', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { enabled: false, onSave: () => Promise.resolve() },
		})
		expect(table.getAllColumns().some((c) => c.id === ACTIONS_COLUMN_ID)).toBe(false)
	})

	it('resizing: { enabled: false } leaves column resizing off', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, resizing: { enabled: false, mode: 'onEnd' } })
		expect(table.options.enableColumnResizing).toBeFalsy()
	})

	it('an object without enabled turns the feature on', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, resizing: { mode: 'onEnd' } })
		expect(table.options.enableColumnResizing).toBe(true)
	})
})

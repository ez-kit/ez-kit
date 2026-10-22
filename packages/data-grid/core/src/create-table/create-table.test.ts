import {
	columnFacetingFeature,
	columnFilteringFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFns,
	globalFilteringFeature,
	rowExpandingFeature,
	rowPaginationFeature,
	rowPinningFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@tanstack/table-core'
import { describe, expect, it, vi } from 'vitest'

import { allDataGridFeatures } from '../features/all'
import { creatingFeature } from '../features/creating'
import { deletingFeature } from '../features/deleting'
import { editingFeature } from '../features/editing'
import { loadingFeature } from '../features/loading'
import { OperatorInput } from '../features/operators'
import { createTable, createColumns } from '../index'
import { defaultOperators } from '../operators/entry'
import { ACTIONS_COLUMN_ID, EXPAND_COLUMN_ID, SELECTION_COLUMN_ID } from '../system-columns'

import { createTableOptions } from './create-table-options'

import type { FilterOperatorDef } from '../features/operators'
import type { RowSelectionState, SortingState, TableFeatures, TableOptions_All, TableState } from '@tanstack/table-core'

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

// ── feature sets ──────────────────────────────────────────────────────────────
// A v9 table models only what its feature set registers, so every config literal below names the
// features that literal exercises. These are the sets, declared once: a table that configures
// `sorting` registers `rowSortingFeature` and the `sortedRowModel` slot that sorts with it, and a
// table that configures nothing registers nothing.

/** Nothing registered. The baseline every "feature off" case is written against. */
const NONE = tableFeatures({})

// `sortFns` is the same story one axis over: v9 resolves every comparator by name, the `'auto'`
// a column with no `sorting.fn` carries included, so a sorting set without it leaves every column
// falling back to a plain string compare.
const SORTING = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel(), sortFns })

// `filterFns` is the registry v9 resolves a named filter function through — the `'auto'` default
// a mapped column carries, `'includesString'`, and every operator's `filterFn` id. Registering the
// feature without it leaves each column with a name that resolves to nothing, and nothing filtered.
const FILTERING = tableFeatures({ columnFilteringFeature, filteredRowModel: createFilteredRowModel(), filterFns })

/** Column filtering plus everything `filtering.faceted` needs to produce facets. */
const FACETED = tableFeatures({
	columnFilteringFeature,
	columnFacetingFeature,
	filteredRowModel: createFilteredRowModel(),
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	filterFns,
})

/**
 * Global search. `columnFilteringFeature` rides along because upstream makes it a prerequisite of
 * `globalFilteringFeature` — a type error at the key otherwise — so the two axes are one feature
 * set, and which of them a table actually offers is decided by config, not by registration.
 */
const GLOBAL_FILTERING = tableFeatures({
	columnFilteringFeature,
	globalFilteringFeature,
	filteredRowModel: createFilteredRowModel(),
	filterFns,
})

const PAGINATION = tableFeatures({ rowPaginationFeature, paginatedRowModel: createPaginatedRowModel() })

const SELECTION = tableFeatures({ rowSelectionFeature })

const EXPANDING = tableFeatures({ rowExpandingFeature, expandedRowModel: createExpandedRowModel() })

const VISIBILITY = tableFeatures({ columnVisibilityFeature })

const COLUMN_PINNING = tableFeatures({ columnPinningFeature })

const ROW_PINNING = tableFeatures({ rowPinningFeature })

/** `columnResizingFeature` cannot be registered without the sizing feature it drives. */
const RESIZING = tableFeatures({ columnResizingFeature, columnSizingFeature })

/**
 * The three write features. Every case below that configures `creating`, `editing` or `deleting`
 * registers them, because a config naming one without its feature is the misconfiguration
 * `createTable` warns about — and the actions column those cases are about is mounted from the
 * config, so the whole block used to pass while emitting that warning on every run. Registering
 * them also sharpens the `initialState` type cases: those assert that `InitialTableState` *omits*
 * the three transient slices, which is only a real assertion when the features are present.
 */
const WRITE = tableFeatures({ creatingFeature, editingFeature, deletingFeature })

/** The same three plus `columnSizingFeature`, for the one case that reads `getSize()`. */
const WRITE_SIZED = tableFeatures({ creatingFeature, editingFeature, deletingFeature, columnSizingFeature })

/**
 * The loading slice. It has no `TableConfig` key at all — the slice is fed through
 * `initialState.loading` or an external `atoms.loading` — so registering the feature is the only
 * thing that puts `loading` on this table's `TableState`, and without it the seed names a slice
 * that does not exist.
 */
const LOADING = tableFeatures({ loadingFeature })

const SELECTION_AND_EXPANDING = tableFeatures({
	rowSelectionFeature,
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * What the assertions below read off a column, and nothing more.
 *
 * `createTable` resolves to a real v9 `Table` now, so this is no longer a stand-in for a type
 * that carried no information. It stays structural for a different reason: a v9 column's API is
 * resolved from its table's **feature set**, and the cases below drive a dozen different sets, so
 * there is no single `Column<TFeatures, Row>` instantiation that types them all. The gated
 * methods that used to sit here — `getCanSort`, `getCanFilter`, `getCanHide`, `getCanPin`,
 * `getSize` — are deliberately gone: each exists only where its feature is registered, and
 * naming them here made this type unsatisfiable by every table that did not register all five.
 * They are read through {@link userColumns}, which infers the real column type per case and so
 * checks each call against the set that actually has the method.
 */
type ColumnLike = {
	id: string
	columnDef: { meta?: { isSystemColumn?: boolean; filtering?: unknown; pinning?: unknown } | undefined }
}

const columnIds = (table: { getAllColumns: () => ColumnLike[] }): string[] => table.getAllColumns().map((c) => c.id)

/**
 * A table's resolved options at the shape that names **every** feature's option, not only the
 * ones this table's own set registered.
 *
 * The cases below assert that the grid wrote a *gate* — `enableSorting: false`,
 * `enableGlobalFilter: false` — and `undefined` versus `false` is the difference each one
 * measures. `TableOptions<TFeatures, …>` declares only the registered features' options, so where
 * a case deliberately registers a feature and leaves it unconfigured the key is still nameable,
 * but the shape stays awkward to write per case. `TableOptions_All` names them all optionally and
 * still type-checks each value, so a gate renamed upstream is a compile error here — which a
 * `Record<string, unknown>` read would not be.
 */
const allOptions = (table: { options: object }): Partial<TableOptions_All<TableFeatures, Row>> => table.options

/** The name of every row the table currently models, in model order. */
const rowNames = (table: { getRowModel: () => { rows: { original: Row }[] } }): string[] =>
	table.getRowModel().rows.map((r) => r.original.name)

// ── sorting ───────────────────────────────────────────────────────────────────

describe('createTable — sorting', () => {
	it('sorting: true sorts rows through the registered sorted row model', () => {
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: true })
		table.setSorting([{ id: 'name', desc: true }])
		expect(rowNames(table)).toEqual(['Bob', 'Alice'])
	})

	it('sorting: { manual: true } sets manualSorting and leaves the rows alone', () => {
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: { manual: true } })
		expect(table.options.manualSorting).toBe(true)
		table.setSorting([{ id: 'name', desc: true }])
		expect(rowNames(table)).toEqual(['Alice', 'Bob'])
	})

	it('sorting: true does not set manualSorting', () => {
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: true })
		expect(table.options.manualSorting).toBeFalsy()
	})

	it('initialState.sorting seeds initialState.sorting and current state', () => {
		const table = createTable({
			features: SORTING,
			data: DATA,
			columns: COLUMNS,
			sorting: true,
			initialState: { sorting: [{ id: 'name', desc: true }] },
		})
		expect(table.initialState.sorting).toEqual([{ id: 'name', desc: true }])
		expect(table.atoms.sorting.get()).toEqual([{ id: 'name', desc: true }])
	})

	// `initialState` merges into the pagination slice instead of replacing it. Spreading the
	// consumer seed over a whole `pagination` default used to wipe the sibling key, so a deep
	// link that seeds only `pageIndex` left `pageSize` undefined and the first page rendered
	// with no size at all.
	it('initialState.pagination seeds one key without dropping the other', () => {
		const table = createTable({
			features: PAGINATION,
			data: DATA,
			columns: COLUMNS,
			pagination: { pageSize: 25 },
			initialState: { pagination: { pageIndex: 3 } },
		})
		expect(table.initialState.pagination).toEqual({ pageIndex: 3, pageSize: 25 })
		expect(table.store.state.pagination).toEqual({ pageIndex: 3, pageSize: 25 })
	})

	it('initialState.pagination can override the configured pageSize', () => {
		const table = createTable({
			features: PAGINATION,
			data: DATA,
			columns: COLUMNS,
			pagination: { pageSize: 25 },
			initialState: { pagination: { pageIndex: 0, pageSize: 50 } },
		})
		expect(table.store.state.pagination).toEqual({ pageIndex: 0, pageSize: 50 })
	})

	it('sorting.descFirst → sortDescFirst', () => {
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: { descFirst: true } })
		expect(table.options.sortDescFirst).toBe(true)
	})

	it('sorting.clearable: false → enableSortingRemoval: false', () => {
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: { clearable: false } })
		expect(table.options.enableSortingRemoval).toBe(false)
	})

	it('sorting.clearable not set — enableSortingRemoval untouched', () => {
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: true })
		expect(table.options.enableSortingRemoval).toBeUndefined()
	})

	it('sorting.multi: true → enableMultiSort: true', () => {
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: { multi: true } })
		expect(table.options.enableMultiSort).toBe(true)
	})

	it('sorting.multi: false → enableMultiSort: false', () => {
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: { multi: false } })
		expect(table.options.enableMultiSort).toBe(false)
	})

	it('sorting.multi: { max: 3 } → enableMultiSort + maxMultiSortColCount', () => {
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: { multi: { max: 3 } } })
		expect(table.options.enableMultiSort).toBe(true)
		expect(table.options.maxMultiSortColCount).toBe(3)
	})

	it('sorting.multi: { removable: false } → enableMultiRemove: false', () => {
		const table = createTable({
			features: SORTING,
			data: DATA,
			columns: COLUMNS,
			sorting: { multi: { removable: false } },
		})
		expect(table.options.enableMultiRemove).toBe(false)
	})

	it("sorting.multi: { event: 'always' } → isMultiSortEvent always true", () => {
		const table = createTable({
			features: SORTING,
			data: DATA,
			columns: COLUMNS,
			sorting: { multi: { event: 'always' } },
		})
		const fn = table.options.isMultiSortEvent
		expect(fn).toBeTypeOf('function')
		expect(fn?.({})).toBe(true)
	})

	it("sorting.multi: { event: 'ctrl' } → isMultiSortEvent fires for ctrlKey/metaKey", () => {
		const table = createTable({
			features: SORTING,
			data: DATA,
			columns: COLUMNS,
			sorting: { multi: { event: 'ctrl' } },
		})
		const fn = table.options.isMultiSortEvent
		expect(fn).toBeTypeOf('function')
		expect(fn?.({ ctrlKey: true })).toBe(true)
		expect(fn?.({ metaKey: true })).toBe(true)
		expect(fn?.({ shiftKey: true })).toBe(false)
	})

	it("sorting.multi: { event: 'shift' } → uses TanStack default (shift-key gated)", () => {
		const table = createTable({
			features: SORTING,
			data: DATA,
			columns: COLUMNS,
			sorting: { multi: { event: 'shift' } },
		})
		const fn = table.options.isMultiSortEvent
		expect(fn).toBeTypeOf('function')
		expect(fn?.({ shiftKey: true })).toBe(true)
		expect(fn?.({ ctrlKey: true })).toBeFalsy()
	})

	// Asserts that the comparator actually *runs*, not that the registry object was echoed back on
	// `table.options`. The echo passes whether or not the registry is wired up, which is exactly
	// the failure it has to catch: v9 reads named comparators out of `options.features.sortFns`,
	// so `sorting.fns` is inert unless it is merged into the feature set.
	//
	// `byLength` is chosen because its order differs from the `alphanumeric` fallback: a name
	// resolving to no comparator sorts Al / Bobby / Zoe, and by length it is Al / Zoe / Bobby.
	// So the assertion distinguishes "used the named comparator" from "silently fell back".
	it('a column naming sorting.fn sorts by that registered comparator', () => {
		const rows: Row[] = [
			{ id: 1, name: 'Zoe', age: 30 },
			{ id: 2, name: 'Al', age: 25 },
			{ id: 3, name: 'Bobby', age: 40 },
		]
		const byLength = vi.fn((a: unknown, b: unknown, id: string) => {
			const av = String((a as { getValue: (k: string) => unknown }).getValue(id) ?? '')
			const bv = String((b as { getValue: (k: string) => unknown }).getValue(id) ?? '')
			return av.length - bv.length
		})

		const table = createTable({
			features: SORTING,
			data: rows,
			columns: createColumns<Row>([
				{ accessorKey: 'name', header: 'Name', sorting: { fn: 'byLength' } },
				{ accessorKey: 'age', header: 'Age' },
			]),
			sorting: { fns: { byLength } },
		})
		table.setSorting([{ id: 'name', desc: false }])

		expect(rowNames(table)).toEqual(['Al', 'Zoe', 'Bobby'])
		expect(byLength).toHaveBeenCalled()
	})

	it('sorting.onChange fires when sort changes via setSorting', () => {
		const onChange = vi.fn()
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: { onChange } })
		table.setSorting([{ id: 'name', desc: false }])
		expect(onChange).toHaveBeenCalledWith([{ id: 'name', desc: false }])
	})

	// Supplying `on<Slice>Change` *replaces* v9's built-in writer, so a handler that only forwarded
	// to the consumer would leave the slice untouched and the feature dead.
	it('sorting state is still recorded when onChange is supplied', () => {
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: { onChange: vi.fn() } })
		table.setSorting([{ id: 'name', desc: true }])
		expect(table.atoms.sorting.get()).toEqual([{ id: 'name', desc: true }])
		expect(rowNames(table)).toEqual(['Bob', 'Alice'])
	})

	it('sorting.onChange not fired when other state mutates', () => {
		const onChange = vi.fn()
		const table = createTable({
			features: tableFeatures({ rowSortingFeature, rowSelectionFeature, sortedRowModel: createSortedRowModel() }),
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
	it('filtering: true filters rows through the registered filtered row model', () => {
		const table = createTable({ features: FILTERING, data: DATA, columns: COLUMNS, filtering: true })
		table.setColumnFilters([{ id: 'name', value: 'Alice' }])
		expect(rowNames(table)).toEqual(['Alice'])
	})

	it('filtering: { manual: true } sets manualFiltering and leaves the rows alone', () => {
		const table = createTable({ features: FILTERING, data: DATA, columns: COLUMNS, filtering: { manual: true } })
		expect(table.options.manualFiltering).toBe(true)
		table.setColumnFilters([{ id: 'name', value: 'Alice' }])
		expect(rowNames(table)).toEqual(['Alice', 'Bob'])
	})

	it('filtering: true without globalFiltering disables global filter', () => {
		const table = createTable({ features: FILTERING, data: DATA, columns: COLUMNS, filtering: true })
		expect(allOptions(table).enableGlobalFilter).toBe(false)
	})
})

// The table-level operator switch, end to end: `filtering.operators` is both the word that
// turns selectors on for every column and the registry the columns reference by id.
describe('createTable — filtering.operators', () => {
	const operatorIds = (
		table: { getColumn: (id: string) => ColumnLike | undefined },
		columnId: string,
	): string[] | undefined => {
		const meta = table.getColumn(columnId)?.columnDef.meta?.filtering as
			| false
			| { operators?: { id: string }[] }
			| undefined
		return meta === false ? undefined : meta?.operators?.map((o) => o.id)
	}

	it('filtering: { operators: true } gives every column its cell type defaults', () => {
		const table = createTable({
			features: FILTERING,
			operators: defaultOperators,
			data: DATA,
			columns: COLUMNS,
			filtering: { operators: true },
		})
		expect(operatorIds(table, 'name')).toContain('contains')
		expect(operatorIds(table, 'age')).toContain('contains')
	})

	it('filtering: { operators: false } silences a column that asks for them', () => {
		const columns = createColumns<Row>([
			{ accessorKey: 'name', filtering: { operators: true } },
			{ accessorKey: 'age' },
		])
		const table = createTable({
			features: FILTERING,
			operators: defaultOperators,
			data: DATA,
			columns,
			filtering: { operators: false },
		})
		expect(operatorIds(table, 'name')).toBeUndefined()
	})

	it('filtering omitting operators keeps the per-column opt-in', () => {
		const columns = createColumns<Row>([
			{ accessorKey: 'name', filtering: { operators: true } },
			{ accessorKey: 'age' },
		])
		const table = createTable({
			features: FILTERING,
			operators: defaultOperators,
			data: DATA,
			columns,
			filtering: true,
		})
		expect(operatorIds(table, 'name')).toContain('contains')
		expect(operatorIds(table, 'age')).toBeUndefined()
	})

	it('resolves a column’s ids in its cell type’s set, beside a definition it writes itself', () => {
		const fuzzy: FilterOperatorDef = { id: 'fuzzy', label: 'Fuzzy', input: OperatorInput.Single, filterFn: () => true }
		const columns = createColumns<Row>([
			{ accessorKey: 'name', filtering: { operators: { items: ['contains', fuzzy] } } },
			{ accessorKey: 'age' },
		])
		const table = createTable({
			features: FILTERING,
			operators: defaultOperators,
			data: DATA,
			columns,
			filtering: { operators: true },
		})
		expect(operatorIds(table, 'name')).toEqual(['contains', 'fuzzy'])
		expect(operatorIds(table, 'age')).toContain('contains')
	})
})

// ── global filtering ──────────────────────────────────────────────────────────

describe('createTable — globalFiltering', () => {
	it('globalFiltering: true leaves enableGlobalFilter on', () => {
		const table = createTable({ features: GLOBAL_FILTERING, data: DATA, columns: COLUMNS, globalFiltering: true })
		expect(table.options.enableGlobalFilter).toBeUndefined()
	})

	it('globalFiltering: true without filtering disables column filters', () => {
		const table = createTable({ features: GLOBAL_FILTERING, data: DATA, columns: COLUMNS, globalFiltering: true })
		expect(table.options.enableColumnFilters).toBe(false)
	})

	it('neither axis configured — both are gated off', () => {
		const table = createTable({ features: NONE, data: DATA, columns: COLUMNS })
		expect(allOptions(table).enableGlobalFilter).toBe(false)
		expect(allOptions(table).enableColumnFilters).toBe(false)
	})

	it('filtering + globalFiltering both truthy — both axes enabled', () => {
		const table = createTable({
			features: GLOBAL_FILTERING,
			data: DATA,
			columns: COLUMNS,
			filtering: true,
			globalFiltering: true,
		})
		expect(table.options.enableColumnFilters).toBe(true)
		expect(table.options.enableGlobalFilter).toBeUndefined()
	})

	it('globalFiltering with inline fn passes function to globalFilterFn', () => {
		const fn = vi.fn(() => true)
		const table = createTable({ features: GLOBAL_FILTERING, data: DATA, columns: COLUMNS, globalFiltering: { fn } })
		expect(table.options.globalFilterFn).toBe(fn)
	})

	it('globalFiltering with string fn that matches registry passes registry fn', () => {
		const fuzzy = vi.fn(() => true)
		const table = createTable({
			features: GLOBAL_FILTERING,
			data: DATA,
			columns: COLUMNS,
			globalFiltering: { fn: 'fuzzy', fns: { fuzzy } },
		})
		expect(table.options.globalFilterFn).toBe(fuzzy)
	})

	it('globalFiltering with string fn that has no registry match passes string through to TanStack', () => {
		const table = createTable({
			features: GLOBAL_FILTERING,
			data: DATA,
			columns: COLUMNS,
			globalFiltering: { fn: 'includesString' },
		})
		expect(table.options.globalFilterFn).toBe('includesString')
	})

	it("globalFiltering: true with no fn — defaults to 'includesString'", () => {
		const table = createTable({ features: GLOBAL_FILTERING, data: DATA, columns: COLUMNS, globalFiltering: true })
		expect(table.options.globalFilterFn).toBe('includesString')
	})

	it('column.globalFiltering: false disables the column for global search', () => {
		const table = createTable({
			features: GLOBAL_FILTERING,
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
		const table = createTable({ features: GLOBAL_FILTERING, data: DATA, columns: COLUMNS, globalFiltering: true })
		table.setGlobalFilter('alice')
		expect(table.getFilteredRowModel().rows).toHaveLength(1)
		expect(table.getFilteredRowModel().rows[0]?.getValue('name')).toBe('Alice')
	})

	it('globalFiltering: { manual: true } sets manualFiltering', () => {
		const table = createTable({
			features: GLOBAL_FILTERING,
			data: DATA,
			columns: COLUMNS,
			globalFiltering: { manual: true },
		})
		expect(table.options.manualFiltering).toBe(true)
	})

	it('globalFiltering: { manual: true } leaves rows untouched by client-side global search', () => {
		const table = createTable({
			features: GLOBAL_FILTERING,
			data: DATA,
			columns: COLUMNS,
			globalFiltering: { manual: true },
		})
		table.setGlobalFilter('alice')
		expect(table.getFilteredRowModel().rows).toHaveLength(DATA.length)
	})

	it('filtering: { manual: true } also stops client-side global search', () => {
		const table = createTable({
			features: GLOBAL_FILTERING,
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
		const table = createTable({
			features: GLOBAL_FILTERING,
			data: DATA,
			columns: COLUMNS,
			globalFiltering: { onChange: vi.fn() },
		})
		table.setGlobalFilter('alice')
		expect(table.options.manualFiltering).toBeUndefined()
		expect(table.getFilteredRowModel().rows).toHaveLength(1)
	})

	it('globalFiltering state is still recorded when onChange is supplied', () => {
		const table = createTable({
			features: GLOBAL_FILTERING,
			data: DATA,
			columns: COLUMNS,
			globalFiltering: { onChange: vi.fn() },
		})
		table.setGlobalFilter('alice')
		expect(table.atoms.globalFilter.get()).toBe('alice')
	})
})

// ── pagination ────────────────────────────────────────────────────────────────

describe('createTable — pagination', () => {
	it('pagination: true paginates through the registered paginated row model', () => {
		const table = createTable({
			features: PAGINATION,
			data: DATA,
			columns: COLUMNS,
			pagination: { pageSize: 1 },
		})
		expect(rowNames(table)).toEqual(['Alice'])
		table.nextPage()
		expect(rowNames(table)).toEqual(['Bob'])
	})

	it('pagination: true uses default pageSize of 10', () => {
		const table = createTable({ features: PAGINATION, data: DATA, columns: COLUMNS, pagination: true })
		expect(table.store.state.pagination.pageSize).toBe(10)
	})

	it('pagination: { pageSize: 5 } sets initial pageSize', () => {
		const table = createTable({ features: PAGINATION, data: DATA, columns: COLUMNS, pagination: { pageSize: 5 } })
		expect(table.store.state.pagination.pageSize).toBe(5)
	})

	it('pagination: { manual: true, pageCount: 42 } sets manualPagination and pageCount', () => {
		const table = createTable({
			features: PAGINATION,
			data: DATA,
			columns: COLUMNS,
			pagination: { manual: true, pageCount: 42 },
		})
		expect(table.options.manualPagination).toBe(true)
		expect(table.options.pageCount).toBe(42)
	})

	it('pagination: { manual: true } without pageCount defaults pageCount to -1', () => {
		const table = createTable({
			features: PAGINATION,
			data: DATA,
			columns: COLUMNS,
			pagination: { manual: true },
		})
		expect(table.options.pageCount).toBe(-1)
	})

	it('pagination: { manual: true, rowCount: 100, pageSize: 10 } derives pageCount via TanStack', () => {
		const table = createTable({
			features: PAGINATION,
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
			features: PAGINATION,
			data: DATA,
			columns: COLUMNS,
			pagination: { manual: true, pageSize: 10, rowCount: 95 },
		})
		// TanStack derives pageCount = ceil(95 / 10) = 10
		expect(table.getPageCount()).toBe(10)
	})

	it('pagination: { manual: true, rowCount: 100 } exposes rowCount via getRowCount()', () => {
		const table = createTable({
			features: PAGINATION,
			data: DATA,
			columns: COLUMNS,
			pagination: { manual: true, pageSize: 10, rowCount: 100 },
		})
		expect(table.getRowCount()).toBe(100)
	})

	it('pagination: { manual: true, pageCount: 5 } with no rowCount leaves rowCount unset', () => {
		const table = createTable({
			features: PAGINATION,
			data: DATA,
			columns: COLUMNS,
			pagination: { manual: true, pageCount: 5 },
		})
		expect(table.options.rowCount).toBeUndefined()
		expect(table.getPageCount()).toBe(5)
	})
})

// ── infinite pagination ───────────────────────────────────────────────────────

// More rows than a page, so a slice to one page is visible as a short row model. Unique names
// make `grouping.by: ['name']` yield one group per row, so a grouped model is still 25 rows long.
const MANY: Row[] = Array.from({ length: 25 }, (_, i) => ({
	id: i + 1,
	name: `Row ${String(i + 1).padStart(2, '0')}`,
	age: i,
}))

describe('createTable — infinite pagination', () => {
	// `allDataGridFeatures` registers `paginatedRowModel`. Infinite mode must not slice through it:
	// regressed in #246, when the model became a slot of the feature set instead of something the
	// core attached only for paged grids.
	it('shows every accumulated row with the all-in feature set', () => {
		const table = createTable({
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			pagination: { mode: 'infinite', pageSize: 10 },
		})
		expect(table.getRowModel().rows).toHaveLength(25)
	})

	it('shows every accumulated row after sorting, filtering and grouping', () => {
		const table = createTable({
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			pagination: { mode: 'infinite', pageSize: 10 },
			sorting: true,
			filtering: true,
			grouping: { by: ['name'] },
			initialState: {
				sorting: [{ id: 'age', desc: true }],
				columnFilters: [{ id: 'name', value: 'Row' }],
			},
		})
		const rows = table.getRowModel().rows
		expect(rows).toHaveLength(25)
		expect(rows[0]?.getIsGrouped()).toBe(true)
	})

	it('picks up data appended by a load', () => {
		const table = createTable({
			features: allDataGridFeatures,
			data: MANY.slice(0, 20),
			columns: COLUMNS,
			pagination: { mode: 'infinite', pageSize: 10 },
		})
		table.setData([...MANY, ...MANY.slice(0, 15).map((r) => ({ ...r, id: r.id + 100 }))])
		expect(table.getRowModel().rows).toHaveLength(40)
	})

	it('says nothing about paginatedRowModel when the set registers it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		createTable({
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			pagination: { mode: 'infinite' },
		})
		const messages = warn.mock.calls.map((args) => String(args[0]))
		expect(messages.filter((m) => m.includes('paginatedRowModel'))).toEqual([])
		warn.mockRestore()
	})

	// An infinite grid has no page to be on: rows always start at the first one. A seeded index
	// would otherwise reach `onStateChange`, a persisted URL and the ARIA row offsets.
	it('starts at pageIndex 0 whatever the seed says, keeping the seeded pageSize', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const table = createTable({
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			pagination: { mode: 'infinite' },
			initialState: { pagination: { pageIndex: 2, pageSize: 20 } },
		})
		expect(table.store.state.pagination).toEqual({ pageIndex: 0, pageSize: 20 })
		expect(table.getRowModel().rows).toHaveLength(25)
		const messages = warn.mock.calls.map((args) => String(args[0]))
		expect(messages.filter((m) => m.includes('initialState.pagination.pageIndex'))).toHaveLength(1)
		expect(messages.find((m) => m.includes('initialState.pagination.pageIndex'))).toContain('infinite')
		warn.mockRestore()
	})

	it('does not warn when the seed leaves pageIndex at 0', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		createTable({
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			pagination: { mode: 'infinite' },
			initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
		})
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})

	// The same set, read by the other two modes: the fix is keyed on the mode, not on the set.
	it('still slices client-side pages with the all-in feature set', () => {
		const table = createTable({
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			pagination: { pageSize: 10 },
		})
		expect(table.getRowModel().rows).toHaveLength(10)
		expect(table.options.manualPagination).toBe(false)
	})

	it('still passes server pages through as they are with the all-in feature set', () => {
		const table = createTable({
			features: allDataGridFeatures,
			data: MANY.slice(0, 10),
			columns: COLUMNS,
			pagination: { manual: true, pageSize: 10, rowCount: 100 },
		})
		expect(table.getRowModel().rows).toHaveLength(10)
		expect(table.getPageCount()).toBe(10)
		expect(table.getRowCount()).toBe(100)
	})

	// The React adapter rebuilds the options in its render body and `useTable` merges them over
	// the previous ones, on the same instance. A mode switch has to take effect that way — which is
	// why the fix is a per-call flag rather than leaving the model out, since the instance caches
	// the paginated row model on first use.
	it('switches from paged to infinite on a live instance', () => {
		const base = { features: allDataGridFeatures, data: MANY, columns: COLUMNS }
		const table = createTable({ ...base, pagination: { pageSize: 10 } })
		expect(table.getRowModel().rows).toHaveLength(10)

		const { options } = createTableOptions({ ...base, pagination: { mode: 'infinite', pageSize: 10 } })
		// `createTableOptions` returns options typed at the widest set, not at this table's; the
		// adapter merges them through the same loosened signature.
		const setOptions = table.setOptions as unknown as (updater: (prev: object) => object) => void
		setOptions((prev) => ({ ...prev, ...options }))

		expect(table.getRowModel().rows).toHaveLength(25)
	})
})

// ── pagination off ────────────────────────────────────────────────────────────

describe('createTable — pagination off', () => {
	// `allDataGridFeatures` registers `paginatedRowModel`, and the core seeds a `pagination` slice on
	// every grid. Without a per-call gate that slice cut a grid nobody paginated to its first page —
	// regressed in #246, the same way infinite mode did.
	it.each([
		['absent', {}],
		['false', { pagination: false }],
		['enabled: false, with settings', { pagination: { enabled: false, pageSize: 5 } }],
	] as const)('shows every row when pagination is %s', (_label, config) => {
		const table = createTable({ features: allDataGridFeatures, data: MANY, columns: COLUMNS, ...config })
		expect(table.getRowModel().rows).toHaveLength(25)
		expect(table.getRowCount()).toBe(25)
		expect(table.options.manualPagination).toBe(true)
	})

	// The seed is kept for the moment pagination is switched on, and affects no row until then.
	it('keeps a seeded page in state without slicing to it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const table = createTable({
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			initialState: { pagination: { pageIndex: 2, pageSize: 10 } },
		})
		expect(table.getRowModel().rows).toHaveLength(25)
		expect(table.getRowModel().rows[0]?.original.name).toBe('Row 01')
		expect(table.store.state.pagination).toEqual({ pageIndex: 2, pageSize: 10 })
		warn.mockRestore()
	})

	it('reports manualPagination: false for client-side pages', () => {
		const table = createTable({
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			pagination: { pageSize: 10 },
		})
		expect(table.options.manualPagination).toBe(false)
	})
})

// `useTable` merges the options it is given over the previous ones, so a key the resolver stops
// writing would keep its old value. The React adapter clears such keys itself; these cases pin
// that the core does not depend on it.
describe('createTable — pagination mode on a live instance', () => {
	const base = { features: allDataGridFeatures, data: MANY, columns: COLUMNS }
	const apply = (table: { setOptions: unknown }, config: object): void => {
		const { options } = createTableOptions({ ...base, ...config })
		const setOptions = table.setOptions as (updater: (prev: object) => object) => void
		setOptions((prev) => ({ ...prev, ...options }))
	}

	it('follows pagination switched on and back off', () => {
		const table = createTable(base)
		expect(table.getRowModel().rows).toHaveLength(25)
		apply(table, { pagination: { pageSize: 10 } })
		expect(table.getRowModel().rows).toHaveLength(10)
		apply(table, {})
		expect(table.getRowModel().rows).toHaveLength(25)
	})

	it.each([
		['infinite', { mode: 'infinite', pageSize: 10 }],
		['manual', { manual: true, pageSize: 10, rowCount: 100 }],
	] as const)('returns from %s to client-side pages', (_label, pagination) => {
		const table = createTable({ ...base, pagination })
		apply(table, { pagination: { pageSize: 10 } })
		expect(table.getRowModel().rows).toHaveLength(10)
		expect(table.getRowCount()).toBe(25)
		expect(table.getPageCount()).toBe(3)
	})

	it('applies a seeded page once pagination is switched on', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const seeded = { ...base, initialState: { pagination: { pageIndex: 2, pageSize: 10 } } }
		const table = createTable(seeded)
		const { options } = createTableOptions({ ...seeded, pagination: true })
		const setOptions = table.setOptions as unknown as (updater: (prev: object) => object) => void
		setOptions((prev) => ({ ...prev, ...options }))
		expect(table.getRowModel().rows.map((row) => row.original.id)).toEqual([21, 22, 23, 24, 25])
		warn.mockRestore()
	})
})

// ── grouping and column filters off ───────────────────────────────────────────

// Upstream applies a registered grouped or filtered row model to whatever state it is handed, and
// `enableGrouping: false` / `enableColumnFilters: false` only hide the UI. So a seed written for a
// feature the config left off still grouped or filtered the rows, with no control to undo it.
describe('createTable — grouping and column filters off', () => {
	// `Row 01` … `Row 09`
	const NAME_FILTER = [{ id: 'name', value: 'Row 0' }]

	it('keeps a seeded grouping in state without grouping the rows', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const table = createTable({
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			initialState: { grouping: ['age'] },
		})
		const rows = table.getRowModel().rows
		expect(rows).toHaveLength(25)
		expect(rows.some((row) => row.getIsGrouped())).toBe(false)
		expect(table.store.state.grouping).toEqual(['age'])
		warn.mockRestore()
	})

	it('groups by the seed when grouping is on', () => {
		const table = createTable({
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			grouping: true,
			initialState: { grouping: ['age'] },
		})
		expect(table.getRowModel().rows[0]?.getIsGrouped()).toBe(true)
	})

	it('keeps seeded column filters in state without filtering the rows', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const table = createTable({
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			initialState: { columnFilters: NAME_FILTER },
		})
		expect(table.getRowModel().rows).toHaveLength(25)
		expect(table.store.state.columnFilters).toEqual(NAME_FILTER)
		warn.mockRestore()
	})

	// The two filter axes share one upstream switch, `manualFiltering`, so turning column filters
	// off must not take global search down with them.
	it('still searches globally while column filters are off', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const table = createTable({
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			globalFiltering: true,
			initialState: { columnFilters: NAME_FILTER, globalFilter: 'Row 2' },
		})
		expect(table.getRowModel().rows.map((row) => row.original.id)).toEqual([20, 21, 22, 23, 24, 25])
		warn.mockRestore()
	})

	it('filters by the seed when filtering is on', () => {
		const table = createTable({
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			filtering: true,
			initialState: { columnFilters: NAME_FILTER },
		})
		expect(table.getRowModel().rows).toHaveLength(9)
	})

	it('applies the kept state once both features are switched on a live instance', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const seeded = {
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			initialState: { grouping: ['age'], columnFilters: NAME_FILTER },
		}
		const table = createTable(seeded)
		expect(table.getRowModel().rows).toHaveLength(25)

		const { options } = createTableOptions({ ...seeded, grouping: true, filtering: true })
		const setOptions = table.setOptions as unknown as (updater: (prev: object) => object) => void
		setOptions((prev) => ({ ...prev, ...options }))

		const rows = table.getRowModel().rows
		expect(rows).toHaveLength(9)
		expect(rows.every((row) => row.getIsGrouped())).toBe(true)

		const { options: offAgain } = createTableOptions(seeded)
		setOptions((prev) => ({ ...prev, ...offAgain }))
		expect(table.getRowModel().rows).toHaveLength(25)
		warn.mockRestore()
	})

	// A changed filter result rewinds the page — upstream does it after each recompute but the
	// first — so a grid on page 5 does not land on an empty page when filtering comes on.
	it('rewinds a client-side page when column filtering is switched on', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const seeded = {
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			pagination: { pageSize: 5 },
			initialState: { columnFilters: NAME_FILTER },
		}
		const table = createTable(seeded)
		table.setPageIndex(4)
		expect(table.getRowModel().rows).toHaveLength(5)

		const { options } = createTableOptions({ ...seeded, filtering: true })
		const setOptions = table.setOptions as unknown as (updater: (prev: object) => object) => void
		setOptions((prev) => ({ ...prev, ...options }))

		expect(table.getRowModel().rows).toHaveLength(5)
		expect(table.store.state.pagination.pageIndex).toBe(0)
		warn.mockRestore()
	})

	// An unpaged grid keeps its dormant page seed: there is no page to rewind.
	it('keeps a seeded page of an unpaged grid when column filtering is switched on', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const seeded = {
			features: allDataGridFeatures,
			data: MANY,
			columns: COLUMNS,
			initialState: { columnFilters: NAME_FILTER, pagination: { pageIndex: 2, pageSize: 10 } },
		}
		const table = createTable(seeded)
		table.getRowModel()

		const { options } = createTableOptions({ ...seeded, filtering: true })
		const setOptions = table.setOptions as unknown as (updater: (prev: object) => object) => void
		setOptions((prev) => ({ ...prev, ...options }))

		expect(table.getRowModel().rows).toHaveLength(9)
		expect(table.store.state.pagination.pageIndex).toBe(2)
		warn.mockRestore()
	})

	// The filtered row model is wrapped so it can follow the switch; the wrapped set must still be
	// one object per consumer set, or every render would hand the table a new `features`.
	it('hands the table the same feature set on every call for the same config', () => {
		const config = { features: allDataGridFeatures, data: MANY, columns: COLUMNS }
		expect(createTableOptions(config).options.features).toBe(createTableOptions(config).options.features)
	})
})

// ── unreachable seeds ─────────────────────────────────────────────────────────

describe('createTable — unreachable seeds', () => {
	// The seed is NOT dropped: it is what the author wrote, and silently ignoring config is
	// worse than honouring it. But with the feature off there is no affordance to undo it, so
	// the grid says so in development instead of leaving it silent.
	// `columnVisibilityFeature` is registered and `visibility` is not configured: the feature this
	// case is about is the grid's table-level switch, and `getCanHide()` has to exist to report it.
	it('visibility.initialHidden still applies when the table feature is off', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const table = createTable({
			features: VISIBILITY,
			data: DATA,
			columns: createColumns<Row>([
				{ accessorKey: 'name' },
				{ accessorKey: 'age', visibility: { initialHidden: true } },
			]),
		})
		expect(table.store.state.columnVisibility).toEqual({ age: false })
		expect(table.getColumn('age')?.getCanHide()).toBe(false)
		warn.mockRestore()
	})

	it('warns when visibility.initialHidden has no feature to undo it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		createTable({
			features: NONE,
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
			features: VISIBILITY,
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
			features: NONE,
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'age', pinning: { initialSide: 'start' } }]),
		})
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0]?.[0]).toContain('pinning.initialSide')
		warn.mockRestore()
	})

	// A static pin is meant to be unchangeable, so it has nothing to warn about.
	it('does not warn for a static pin', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		createTable({
			features: NONE,
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'age', pinning: 'start' }]),
		})
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})

	it('does not warn when the pinning feature is on', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		createTable({
			features: COLUMN_PINNING,
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'age', pinning: { initialSide: 'start' } }]),
			pinning: { column: true },
		})
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})

// ── seeds for a feature the config left off ──────────────────────────────────

// The seed is kept for the moment its feature is switched on and changes no row until then, so the
// grid says so in development rather than leaving a seed that silently does nothing.
describe('createTable — seeds for a feature that is off', () => {
	const seedWarnings = (config: object): string[] => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		createTable({ features: allDataGridFeatures, data: MANY, columns: COLUMNS, ...config })
		const messages = warn.mock.calls.map((args) => String(args[0])).filter((m) => m.includes('initialState.'))
		warn.mockRestore()
		return messages
	}

	it.each([
		['pagination', 'pagination', { pagination: { pageIndex: 2 } }],
		['columnFilters', 'filtering', { columnFilters: [{ id: 'name', value: 'Row 0' }] }],
		['grouping', 'grouping', { grouping: ['age'] }],
		['sorting', 'sorting', { sorting: [{ id: 'age', desc: true }] }],
		['globalFilter', 'globalFiltering', { globalFilter: 'Row' }],
		['expanded', 'expanding', { expanded: true }],
		['rowPinning', 'pinning.row', { rowPinning: { top: ['1'], bottom: [] } }],
	] as const)('warns once about initialState.%s while `%s` is off', (slice, feature, initialState) => {
		const messages = seedWarnings({ initialState })
		expect(messages).toHaveLength(1)
		expect(messages[0]).toContain(`initialState.${slice}`)
		expect(messages[0]).toContain(`\`${feature}\``)
	})

	it.each([
		['pagination', { pagination: true, initialState: { pagination: { pageIndex: 2 } } }],
		['filtering', { filtering: true, initialState: { columnFilters: [{ id: 'name', value: 'Row 0' }] } }],
		['grouping', { grouping: true, initialState: { grouping: ['age'] } }],
		['sorting', { sorting: true, initialState: { sorting: [{ id: 'age', desc: true }] } }],
		['globalFiltering', { globalFiltering: true, initialState: { globalFilter: 'Row' } }],
		['expanding', { expanding: true, initialState: { expanded: true } }],
		['pinning.row', { pinning: { row: true }, initialState: { rowPinning: { top: ['1'], bottom: [] } } }],
	] as const)('says nothing while `%s` is on', (_feature, config) => {
		expect(seedWarnings(config)).toEqual([])
	})

	// The core seeds `pagination` on every grid itself; only the author's seed is worth a word.
	it('says nothing about a pagination slice nobody seeded', () => {
		expect(seedWarnings({})).toEqual([])
	})

	// Expansion is what opens a group row, so a grouped grid uses the seed without `expanding`.
	it('says nothing about initialState.expanded while grouping is on', () => {
		expect(seedWarnings({ grouping: true, initialState: { expanded: true } })).toEqual([])
	})
})

// ── selection ─────────────────────────────────────────────────────────────────

describe('createTable — selection', () => {
	it('selection: true enables enableRowSelection', () => {
		const table = createTable({ features: SELECTION, data: DATA, columns: COLUMNS, selection: true })
		expect(table.options.enableRowSelection).toBe(true)
	})

	it('selection not set — enableRowSelection is false', () => {
		const table = createTable({ features: NONE, data: DATA, columns: COLUMNS })
		expect(allOptions(table).enableRowSelection).toBe(false)
	})

	it('selection: { onChange } fires with the slice first, then the selected ids', () => {
		const onChange = vi.fn()
		const table = createTable({ features: SELECTION, data: DATA, columns: COLUMNS, selection: { onChange } })
		table.getRow('1').toggleSelected(true)
		expect(onChange).toHaveBeenCalledWith({ '1': true }, ['1'])
	})

	it('reports only the truthy entries as ids — a consumer-written `false` is not selected', () => {
		// v9 narrowed `RowSelectionState` to `Record<string, true>`, so on the types the filter
		// behind this is dead. It is not dead at runtime: the atom can be consumer-owned, and an
		// app writer can put a literal `false` in it. Deleting the filter — the tidy-up the narrowed
		// type invites — would report row 2 as selected, to the one callback that names the ids.
		const onChange = vi.fn()
		const table = createTable({ features: SELECTION, data: DATA, columns: COLUMNS, selection: { onChange } })

		table.setRowSelection({ '1': true, '2': false } as unknown as RowSelectionState)

		expect(onChange).toHaveBeenCalledWith({ '1': true, '2': false }, ['1'])
	})

	// The assertion this suite was missing. `selection.onChange` used to be carried by TanStack's
	// `onRowSelectionChange`, which *replaces* the built-in state writer — so supplying a callback
	// silently stopped the selection from ever being recorded, and every checkbox went dead. The
	// old test passed throughout, because it only checked that the callback fired.
	it('selection state is still recorded when onChange is supplied', () => {
		const table = createTable({
			features: SELECTION,
			data: DATA,
			columns: COLUMNS,
			selection: { onChange: vi.fn() },
		})
		table.getRow('1').toggleSelected(true)
		expect(table.atoms.rowSelection.get()).toEqual({ '1': true })
		expect(table.getRow('1').getIsSelected()).toBe(true)
	})

	// `selection.multiple` was declared, documented ("Set `false` to allow only one selected
	// row") and read by nothing at all: TanStack defaults `enableMultiRowSelection` to true, so
	// the grid kept accumulating rows. Renamed to `multi` (matching `sorting.multi`) and wired.
	it('selection: { multi: false } disables enableMultiRowSelection', () => {
		const table = createTable({ features: SELECTION, data: DATA, columns: COLUMNS, selection: { multi: false } })
		expect(table.options.enableMultiRowSelection).toBe(false)
	})

	it('selection: { multi: false } — selecting a row replaces the previous one', () => {
		const table = createTable({ features: SELECTION, data: DATA, columns: COLUMNS, selection: { multi: false } })
		table.getRow('1').toggleSelected(true)
		table.getRow('2').toggleSelected(true)
		expect(table.store.state.rowSelection).toEqual({ '2': true })
	})

	it('selection: true — rows accumulate', () => {
		const table = createTable({ features: SELECTION, data: DATA, columns: COLUMNS, selection: true })
		table.getRow('1').toggleSelected(true)
		table.getRow('2').toggleSelected(true)
		expect(table.store.state.rowSelection).toEqual({ '1': true, '2': true })
	})
})

// ── per-feature onChange ──────────────────────────────────────────────────────

describe('createTable — per-feature onChange', () => {
	it('visibility.onChange fires with the visibility slice', () => {
		const onChange = vi.fn()
		const table = createTable({ features: VISIBILITY, data: DATA, columns: COLUMNS, visibility: { onChange } })
		table.getColumn('name')?.toggleVisibility(false)
		expect(onChange).toHaveBeenCalledWith({ name: false })
		expect(table.store.state.columnVisibility).toEqual({ name: false })
	})

	it('pinning.column.onChange fires with the column-pinning slice', () => {
		const onChange = vi.fn()
		const table = createTable({
			features: COLUMN_PINNING,
			data: DATA,
			columns: COLUMNS,
			pinning: { column: { onChange } },
		})
		table.getColumn('name')?.pin('start')
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ start: ['name'] }))
	})

	it('pinning.row.onChange fires with the row-pinning slice', () => {
		const onChange = vi.fn()
		const table = createTable({
			features: ROW_PINNING,
			data: DATA,
			columns: COLUMNS,
			pinning: { row: { top: true, onChange } },
		})
		table.getRow('1').pin('top')
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ top: ['1'] }))
	})

	it('resizing.onChange fires with the committed column sizes', () => {
		const onChange = vi.fn()
		const table = createTable({ features: RESIZING, data: DATA, columns: COLUMNS, resizing: { onChange } })
		table.setColumnSizing({ name: 240 })
		expect(onChange).toHaveBeenCalledWith({ name: 240 })
	})

	it('expanding.onChange fires with the expanded slice', () => {
		const onChange = vi.fn()
		const table = createTable({
			features: EXPANDING,
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
			features: VISIBILITY,
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
	it("expanding: { mode: 'tree' } nests sub-rows through the registered expanded row model", () => {
		type TreeRow = Row & { children?: TreeRow[] }
		const tree: TreeRow[] = [{ id: 1, name: 'Alice', age: 30, children: [{ id: 2, name: 'Bob', age: 25 }] }]
		const table = createTable({
			features: EXPANDING,
			data: tree,
			columns: createColumns<TreeRow>([{ accessorKey: 'name' }, { accessorKey: 'age' }]),
			expanding: { mode: 'tree', getSubRows: (row: TreeRow) => row.children },
		})
		expect(rowNames(table)).toEqual(['Alice'])
		table.getRow('1').toggleExpanded(true)
		expect(rowNames(table)).toEqual(['Alice', 'Bob'])
	})
})

// ── row pinning ───────────────────────────────────────────────────────────────

describe('createTable — pinning', () => {
	it('pinning: { row: { top: true } } enables enableRowPinning', () => {
		const table = createTable({ features: ROW_PINNING, data: DATA, columns: COLUMNS, pinning: { row: { top: true } } })
		expect(table.options.enableRowPinning).toBe(true)
	})

	it('pinning: { row: { bottom: true } } enables enableRowPinning', () => {
		const table = createTable({
			features: ROW_PINNING,
			data: DATA,
			columns: COLUMNS,
			pinning: { row: { bottom: true } },
		})
		expect(table.options.enableRowPinning).toBe(true)
	})

	// One side switched off explicitly must not switch the other off with it: the gate read
	// `top ?? bottom`, and `false ?? true` is `false`.
	it('pinning: { row: { top: false, bottom: true } } enables enableRowPinning', () => {
		const table = createTable({
			features: ROW_PINNING,
			data: DATA,
			columns: COLUMNS,
			pinning: { row: { top: false, bottom: true } },
		})
		expect(table.options.enableRowPinning).toBe(true)
	})

	it('pinning: { row: { top: false, bottom: false } } leaves row pinning off', () => {
		const table = createTable({
			features: ROW_PINNING,
			data: DATA,
			columns: COLUMNS,
			pinning: { row: { top: false, bottom: false } },
		})
		expect(table.options.enableRowPinning).toBeUndefined()
	})

	it('pinning: { row: { top: true, bottom: true } } sets keepPinnedRows to false', () => {
		const table = createTable({
			features: ROW_PINNING,
			data: DATA,
			columns: COLUMNS,
			pinning: { row: { top: true, bottom: true } },
		})
		expect(table.options.keepPinnedRows).toBe(false)
	})

	it('pinning: true enables enableRowPinning (top+bottom)', () => {
		const table = createTable({
			features: tableFeatures({ rowPinningFeature, columnPinningFeature }),
			data: DATA,
			columns: COLUMNS,
			pinning: true,
		})
		expect(table.options.enableRowPinning).toBe(true)
	})

	it('pinning: { row: true } enables enableRowPinning (top+bottom)', () => {
		const table = createTable({ features: ROW_PINNING, data: DATA, columns: COLUMNS, pinning: { row: true } })
		expect(table.options.enableRowPinning).toBe(true)
	})

	it('pinning: { column: true } does NOT enable row pinning', () => {
		const table = createTable({ features: COLUMN_PINNING, data: DATA, columns: COLUMNS, pinning: { column: true } })
		expect(allOptions(table).enableRowPinning).toBeFalsy()
	})

	it('pinning not set — enableRowPinning is falsy', () => {
		const table = createTable({ features: NONE, data: DATA, columns: COLUMNS })
		expect(allOptions(table).enableRowPinning).toBeFalsy()
	})

	it('pinning: {} (neither row nor column) does not enable row pinning', () => {
		const table = createTable({ features: NONE, data: DATA, columns: COLUMNS, pinning: {} })
		expect(allOptions(table).enableRowPinning).toBeFalsy()
	})
})

// ── creating / editing / deleting ─────────────────────────────────────────────

describe('createTable — creating / editing / deleting', () => {
	it('creating config is stored in table options', () => {
		const cfg = { onSave: () => Promise.resolve() }
		const table = createTable({ features: WRITE, data: DATA, columns: COLUMNS, creating: cfg })
		expect(allOptions(table).creating).toBe(cfg)
	})

	it('editing config is stored in table options', () => {
		const cfg = { mode: 'row' as const, onSave: () => Promise.resolve() }
		const table = createTable({ features: WRITE, data: DATA, columns: COLUMNS, editing: cfg })
		expect(allOptions(table).editing).toBe(cfg)
	})

	it('deleting config is stored in table options', () => {
		const cfg = { onDelete: () => {} }
		const table = createTable({ features: WRITE, data: DATA, columns: COLUMNS, deleting: cfg })
		expect(allOptions(table).deleting).toBe(cfg)
	})

	it('creating not set — options.creating is undefined', () => {
		const table = createTable({ features: WRITE, data: DATA, columns: COLUMNS })
		expect(allOptions(table).creating).toBeUndefined()
	})
})

// ── loading ─────────────────────────────────────────────────────────────────

describe('createTable — loading', () => {
	// The companion case — that `loadingFeature` contributes the all-false default when nothing
	// seeds it — is the same assertion `features/loading/loading.test.ts:19` makes, so this file
	// keeps only the half that is about `createTable`: the consumer's seed reaching the slice.
	it('initialState.loading seeds the controlled slice', () => {
		const table = createTable({
			features: LOADING,
			data: DATA,
			columns: COLUMNS,
			initialState: { loading: { isPending: true, isFetching: false, isError: false, error: null } },
		})
		expect(table.store.state.loading.isPending).toBe(true)
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
			features: WRITE,
			data: DATA,
			columns: COLUMNS,
			// @ts-expect-error — `editing` is transient per-open-form state, hard-reset by the feature
			initialState: { editing: { rowId: '1', values: {}, errors: {}, commitStatus: 'idle' } },
		})

		createTable({
			features: WRITE,
			data: DATA,
			columns: COLUMNS,
			// @ts-expect-error — `creating` is transient per-open-form state, hard-reset by the feature
			initialState: { creating: { values: {}, errors: {}, commitStatus: 'idle' } },
		})

		createTable({
			features: WRITE,
			data: DATA,
			columns: COLUMNS,
			// @ts-expect-error — `deleting` is transient per-dialog state, hard-reset by the feature
			initialState: { deleting: { pendingRowId: '1', pendingBulk: false } },
		})

		// `loading` still deep-merges the consumer's value, so it stays allowed.
		createTable({
			features: LOADING,
			data: DATA,
			columns: COLUMNS,
			initialState: { loading: { isPending: true, isFetching: false, isError: false, error: null } },
		})
	})
})

// ── system columns ────────────────────────────────────────────────────────────

describe('createTable — system columns', () => {
	it('no features → only user columns are present', () => {
		const table = createTable({ features: WRITE, data: DATA, columns: COLUMNS })
		expect(columnIds(table)).toEqual(['name', 'age'])
	})

	it('selection: true prepends __selection__ column', () => {
		const table = createTable({ features: SELECTION, data: DATA, columns: COLUMNS, selection: true })
		expect(columnIds(table)[0]).toBe(SELECTION_COLUMN_ID)
	})

	it('expanding: true prepends __expand__ column after __selection__', () => {
		const table = createTable({
			features: SELECTION_AND_EXPANDING,
			data: DATA,
			columns: COLUMNS,
			selection: true,
			expanding: true,
		})
		const ids = columnIds(table)
		expect(ids[0]).toBe(SELECTION_COLUMN_ID)
		expect(ids[1]).toBe(EXPAND_COLUMN_ID)
	})

	it('editing: true appends __actions__ column after user columns', () => {
		const table = createTable({
			features: WRITE,
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'row', onSave: () => Promise.resolve() },
		})
		expect(columnIds(table).at(-1)).toBe(ACTIONS_COLUMN_ID)
	})

	it('editing: { mode: cell } alone appends no __actions__ column', () => {
		const table = createTable({
			features: WRITE,
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'cell', onSave: () => Promise.resolve() },
		})
		// The pencil there starts the row flow, which opens nothing in cell mode — so the column
		// would be an empty strip whose width is reserved for a button that must not be drawn.
		expect(columnIds(table)).not.toContain(ACTIONS_COLUMN_ID)
	})

	it('editing: { mode: cell } still shares the __actions__ column another feature asked for', () => {
		const table = createTable({
			features: WRITE,
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'cell', onSave: () => Promise.resolve() },
			deleting: { onDelete: () => {} },
		})
		expect(columnIds(table).at(-1)).toBe(ACTIONS_COLUMN_ID)
	})

	it('deleting: true appends __actions__ column after user columns', () => {
		const table = createTable({ features: WRITE, data: DATA, columns: COLUMNS, deleting: { onDelete: () => {} } })
		expect(columnIds(table).at(-1)).toBe(ACTIONS_COLUMN_ID)
	})

	it('creating: { mode: row } alone appends no __actions__ column', () => {
		// The column would stand empty until someone pressed the create trigger, and mounting it
		// on open would take its fixed width off the `1fr` tracks — every column jumping on each
		// open and again on each close. Such a grid puts save / cancel in the toolbar instead.
		const table = createTable({
			features: WRITE,
			data: DATA,
			columns: COLUMNS,
			creating: { mode: 'row', onSave: () => {} },
		})
		expect(columnIds(table)).not.toContain(ACTIONS_COLUMN_ID)
	})

	it('creating: { mode: row } shares the __actions__ column another feature asked for', () => {
		const table = createTable({
			features: WRITE,
			data: DATA,
			columns: COLUMNS,
			creating: { mode: 'row', onSave: () => {} },
			deleting: { onDelete: () => {} },
		})
		expect(columnIds(table).at(-1)).toBe(ACTIONS_COLUMN_ID)
	})

	it('creating: { mode: row } widens the shared __actions__ column to the save / cancel pair', () => {
		// No structural stand-in: `SIZING` registers `columnSizingFeature`, so the columns this
		// returns have `getSize()` on their real type and the read is checked against it.
		const sizeOf = (config: Parameters<typeof createTable<typeof WRITE_SIZED, Row>>[0]): number | undefined =>
			createTable(config)
				.getAllColumns()
				.find((col) => col.id === ACTIONS_COLUMN_ID)
				?.getSize()

		const deleteOnly = sizeOf({ features: WRITE_SIZED, data: DATA, columns: COLUMNS, deleting: { onDelete: () => {} } })
		const withDraft = sizeOf({
			features: WRITE_SIZED,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: () => {} },
			creating: { mode: 'row', onSave: () => {} },
		})

		expect(withDraft).toBeGreaterThan(deleteOnly ?? 0)
	})

	it('creating: { mode: pin-row } alone appends the __actions__ column', () => {
		// The pinned draft row is permanent, so the cell always holds its save button — the
		// column is never the empty strip that `mode: 'row'` would leave behind.
		const table = createTable({
			features: WRITE,
			data: DATA,
			columns: COLUMNS,
			creating: { mode: 'pin-row', onSave: () => {} },
		})
		expect(columnIds(table).at(-1)).toBe(ACTIONS_COLUMN_ID)
	})

	it('creating: { mode: modal } alone appends no __actions__ column', () => {
		// The modal carries its own footer buttons, so nothing is rendered per row.
		const table = createTable({
			features: WRITE,
			data: DATA,
			columns: COLUMNS,
			creating: { mode: 'modal', onSave: () => {} },
		})
		expect(columnIds(table)).not.toContain(ACTIONS_COLUMN_ID)
	})

	it('pinning: { row: { top: true } } alone appends the __actions__ column', () => {
		const table = createTable({ features: ROW_PINNING, data: DATA, columns: COLUMNS, pinning: { row: { top: true } } })
		expect(columnIds(table).at(-1)).toBe(ACTIONS_COLUMN_ID)
	})

	it('editing and pinning together share a single __actions__ column', () => {
		const table = createTable({
			features: tableFeatures({ rowPinningFeature, editingFeature }),
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
			features: tableFeatures({
				rowSelectionFeature,
				rowExpandingFeature,
				rowPinningFeature,
				editingFeature,
				expandedRowModel: createExpandedRowModel(),
			}),
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
			features: tableFeatures({ rowSelectionFeature, rowPinningFeature }),
			data: DATA,
			columns: COLUMNS,
			selection: true,
			pinning: { row: { top: true } },
		})
		expect(table.getColumn(SELECTION_COLUMN_ID)?.columnDef.meta?.isSystemColumn).toBe(true)
		expect(table.getColumn(ACTIONS_COLUMN_ID)?.columnDef.meta?.isSystemColumn).toBe(true)
	})

	it('__actions__ column has meta.pinning: { side: "end" }', () => {
		const table = createTable({
			features: WRITE,
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'row', onSave: () => Promise.resolve() },
		})
		expect(table.getColumn(ACTIONS_COLUMN_ID)?.columnDef.meta?.pinning).toEqual({ side: 'end' })
	})
})

// ── virtualized ───────────────────────────────────────────────────────────────
// Row virtualization is drawn entirely by the React layer, so it travels on `table.grid` — the
// non-TanStack half of the resolved config — rather than on `table.options`.

describe('createTable — virtualized', () => {
	it('virtualized not set — grid.virtualization is undefined, and it is not an option', () => {
		const table = createTable({ features: WRITE, data: DATA, columns: COLUMNS })
		expect(table.grid.virtualization).toBeUndefined()
		expect(table.options).not.toHaveProperty('virtualization')
	})

	it('virtualization: true — stored on grid', () => {
		const table = createTable({ features: WRITE, data: DATA, columns: COLUMNS, virtualization: true })
		expect(table.grid.virtualization).toBe(true)
	})

	it('virtualization: { row: true } — stored on grid', () => {
		const table = createTable({ features: WRITE, data: DATA, columns: COLUMNS, virtualization: { row: true } })
		expect(table.grid.virtualization).toEqual({ row: true })
	})

	it('virtualization: { row: { overscan: 10 } } — stored on grid with custom options', () => {
		const table = createTable({
			features: WRITE,
			data: DATA,
			columns: COLUMNS,
			virtualization: { row: { overscan: 10 } },
		})
		expect(table.grid.virtualization).toEqual({ row: { overscan: 10 } })
	})

	it('virtualization: { row: { estimateSize: () => 64 } } — stored on grid with custom estimateSize', () => {
		const estimateSize = () => 64
		const table = createTable({
			features: WRITE,
			data: DATA,
			columns: COLUMNS,
			virtualization: { row: { estimateSize } },
		})
		expect(table.grid.virtualization).toEqual({ row: { estimateSize } })
	})
})

// ── store / setData ────────────────────────────────────────────────────────────

describe('createTable — store / setData', () => {
	it('table.store.subscribe fires when row selection changes', () => {
		const table = createTable({ features: SELECTION, data: DATA, columns: COLUMNS, selection: true })
		const listener = vi.fn()
		const sub = table.store.subscribe(listener)
		table.getRow('1').toggleSelected(true)
		expect(listener).toHaveBeenCalled()
		sub.unsubscribe()
	})

	it('table.store.state is a new reference after row selection changes', () => {
		const table = createTable({ features: SELECTION, data: DATA, columns: COLUMNS, selection: true })
		const before = table.store.state
		table.getRow('1').toggleSelected(true)
		expect(table.store.state).not.toBe(before)
	})

	it('table data updates after setData', () => {
		const table = createTable({ features: WRITE, data: DATA, columns: COLUMNS })
		table.setData([{ id: 3, name: 'Carol', age: 28 }])
		expect(rowNames(table)).toEqual(['Carol'])
	})
})

// ── config.onStateChange ──────────────────────────────────────────────────────
// The whole-state callback every controlled-state consumer is written against. It survived the
// funnel's deletion as one `table.store.subscribe`, and these cases are what stop it going silent
// again — the failure mode is invisible from inside the grid, which keeps working perfectly while
// the consumer's `useState` never updates.

describe('createTable — config.onStateChange', () => {
	it('fires with the whole state when a slice changes', () => {
		// Typed, so `calls[0][0].sorting` below is a checked read of the emitted state rather than
		// a member access on `any` — which is what it was, and what would have let the slice be
		// renamed without this case noticing.
		const onStateChange = vi.fn<(state: TableState<typeof SORTING>) => void>()
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: true, onStateChange })

		table.setSorting([{ id: 'name', desc: true }])

		expect(onStateChange).toHaveBeenCalledTimes(1)
		expect(onStateChange.mock.calls[0]?.[0]).toBe(table.store.state)
		expect(onStateChange.mock.calls[0]?.[0].sorting).toEqual([{ id: 'name', desc: true }])
	})

	it('fires for every feature, not only the ones with their own onChange', () => {
		const onStateChange = vi.fn<(state: TableState<typeof SELECTION>) => void>()
		const table = createTable({
			features: SELECTION,
			data: DATA,
			columns: COLUMNS,
			selection: true,
			onStateChange,
		})

		table.getRow('1').toggleSelected(true)

		expect(onStateChange).toHaveBeenCalled()
		expect(onStateChange.mock.calls.at(-1)?.[0].rowSelection).toEqual({ '1': true })
	})

	it('coexists with a per-feature onChange — both fire', () => {
		const onStateChange = vi.fn()
		const onChange = vi.fn()
		const table = createTable({
			features: SORTING,
			data: DATA,
			columns: COLUMNS,
			sorting: { onChange },
			onStateChange,
		})

		table.setSorting([{ id: 'name', desc: false }])

		expect(onChange).toHaveBeenCalledWith([{ id: 'name', desc: false }])
		expect(onStateChange).toHaveBeenCalledTimes(1)
	})

	it('is not called when nothing changed', () => {
		const onStateChange = vi.fn()
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: true, onStateChange })

		// The same reference back: v9's store emits on an actual state change, so there is nothing
		// for this task to diff. The funnel used to do that comparison by hand.
		table.setSorting((prev: SortingState) => prev)

		expect(onStateChange).not.toHaveBeenCalled()
	})
})

// ── table-level off semantics ─────────────────────────────────────────────────
// Falsy table-level config (undefined or false) must fully disable a feature for
// every user column, overriding TanStack's per-column defaults. Truthy config
// (true or object) restores the default and lets per-column overrides apply.

/**
 * The user columns of a table, keeping whatever API its feature set gave them.
 *
 * Generic over the column rather than returning {@link ColumnLike}: each case below reads a
 * different gated method (`getCanSort`, `getCanPin`, …), and in v9 each of those exists only on a
 * table that registered its feature. Inferring the column type per call is what keeps every one
 * of those reads checked against the set that has it, instead of against a hand-written shape
 * that claims all five.
 */
const userColumns = <TColumn extends ColumnLike>(table: { getAllColumns: () => TColumn[] }): TColumn[] =>
	table.getAllColumns().filter((c) => !c.columnDef.meta?.isSystemColumn)

describe('createTable — table-level off: sorting', () => {
	it('sorting undefined → enableSorting: false, all user columns getCanSort() = false', () => {
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS })
		expect(table.options.enableSorting).toBe(false)
		expect(userColumns(table).every((c) => !c.getCanSort())).toBe(true)
	})

	it('sorting: false → enableSorting: false', () => {
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: false })
		expect(table.options.enableSorting).toBe(false)
		expect(userColumns(table).every((c) => !c.getCanSort())).toBe(true)
	})

	it('sorting: true → enableSorting untouched, user columns can sort', () => {
		const table = createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: true })
		expect(table.options.enableSorting).toBeUndefined()
		expect(userColumns(table).every((c) => c.getCanSort())).toBe(true)
	})
})

describe('createTable — table-level off: filtering', () => {
	it('filtering undefined → enableColumnFilters: false, all user columns getCanFilter() = false', () => {
		const table = createTable({ features: FILTERING, data: DATA, columns: COLUMNS })
		expect(table.options.enableColumnFilters).toBe(false)
		expect(userColumns(table).every((c) => !c.getCanFilter())).toBe(true)
	})

	it('filtering: false → enableColumnFilters: false', () => {
		const table = createTable({ features: FILTERING, data: DATA, columns: COLUMNS, filtering: false })
		expect(table.options.enableColumnFilters).toBe(false)
	})

	it('filtering: true → enableColumnFilters: true, user columns can filter', () => {
		const table = createTable({ features: FILTERING, data: DATA, columns: COLUMNS, filtering: true })
		expect(table.options.enableColumnFilters).toBe(true)
		expect(userColumns(table).every((c) => c.getCanFilter())).toBe(true)
	})
})

describe('createTable — table-level off: visibility', () => {
	it('visibility undefined → enableHiding: false, all user columns getCanHide() = false', () => {
		const table = createTable({ features: VISIBILITY, data: DATA, columns: COLUMNS })
		expect(table.options.enableHiding).toBe(false)
		expect(userColumns(table).every((c) => !c.getCanHide())).toBe(true)
	})

	it('visibility: false → enableHiding: false', () => {
		const table = createTable({ features: VISIBILITY, data: DATA, columns: COLUMNS, visibility: false })
		expect(table.options.enableHiding).toBe(false)
	})

	it('visibility: true → enableHiding untouched, user columns can hide', () => {
		const table = createTable({ features: VISIBILITY, data: DATA, columns: COLUMNS, visibility: true })
		expect(table.options.enableHiding).toBeUndefined()
		expect(userColumns(table).every((c) => c.getCanHide())).toBe(true)
	})
})

describe('createTable — table-level off: column pinning', () => {
	it('pinning undefined → enableColumnPinning: false, user columns getCanPin() = false', () => {
		const table = createTable({ features: COLUMN_PINNING, data: DATA, columns: COLUMNS })
		expect(table.options.enableColumnPinning).toBe(false)
		expect(userColumns(table).every((c) => !c.getCanPin())).toBe(true)
	})

	it('pinning: false → enableColumnPinning: false', () => {
		const table = createTable({ features: COLUMN_PINNING, data: DATA, columns: COLUMNS, pinning: false })
		expect(table.options.enableColumnPinning).toBe(false)
	})

	it('pinning: { column: true } → enableColumnPinning untouched, user columns can pin', () => {
		const table = createTable({ features: COLUMN_PINNING, data: DATA, columns: COLUMNS, pinning: { column: true } })
		expect(table.options.enableColumnPinning).toBeUndefined()
		expect(userColumns(table).every((c) => c.getCanPin())).toBe(true)
	})

	it('pinning: { row: { top: true } } → column pinning stays disabled', () => {
		const table = createTable({
			features: tableFeatures({ rowPinningFeature, columnPinningFeature }),
			data: DATA,
			columns: COLUMNS,
			pinning: { row: { top: true } },
		})
		expect(table.options.enableColumnPinning).toBe(false)
	})
})

describe('createTable — faceted', () => {
	// There is no "faceting registered but not computing" case left to assert: the gate used to be
	// `getFacetedUniqueValues()` being attached here on the column's behalf, and in v9 the slot is
	// the consumer's to register. A config that asks for facets without the slots now warns
	// instead — see the guard cases in `create-table-options.test.ts`.

	it('filtering: { faceted: true } populates facets with unique values + counts', () => {
		const table = createTable({
			features: FACETED,
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
			features: FACETED,
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
		{ accessorKey: 'name', header: 'Name', pinning: { side: 'start' } },
		{ accessorKey: 'age', header: 'Age' },
	])

	const DEFAULT_PINNED_COLUMNS = createColumns<Row>([
		{ accessorKey: 'name', header: 'Name', pinning: { initialSide: 'start' } },
		{ accessorKey: 'age', header: 'Age' },
	])

	const HIDDEN_COLUMNS = createColumns<Row>([
		{ accessorKey: 'name', header: 'Name', visibility: { initialHidden: true } },
		{ accessorKey: 'age', header: 'Age' },
	])

	/** Selection and deletion both mount a system column, and a system column's pin is an invariant. */
	// `deletingFeature` is in the set because every case below configures `deleting` — it is what
	// mounts the `__actions__` column these cases are about. Registering it is not decoration: a
	// `deleting` config without it is the misconfiguration `createTable` warns on, and these cases
	// were emitting that warning on every run.
	const SYSTEM_COLUMN_FEATURES = tableFeatures({
		rowSelectionFeature,
		columnPinningFeature,
		columnVisibilityFeature,
		deletingFeature,
	})

	it('column initialSide seeds columnPinning', () => {
		const table = createTable({
			features: COLUMN_PINNING,
			data: DATA,
			columns: DEFAULT_PINNED_COLUMNS,
			pinning: { column: true },
		})
		expect(table.store.state.columnPinning.start).toContain('name')
	})

	it('consumer initialState.columnPinning wins over a initialSide it mentions', () => {
		const table = createTable({
			features: COLUMN_PINNING,
			data: DATA,
			columns: DEFAULT_PINNED_COLUMNS,
			pinning: { column: true },
			initialState: { columnPinning: { start: [], end: ['name'] } },
		})
		expect(table.store.state.columnPinning.start).not.toContain('name')
		expect(table.store.state.columnPinning.end).toContain('name')
	})

	it('a initialSide the consumer never mentions keeps its seed', () => {
		const table = createTable({
			features: COLUMN_PINNING,
			data: DATA,
			columns: DEFAULT_PINNED_COLUMNS,
			pinning: { column: true },
			initialState: { columnPinning: { start: ['age'], end: [] } },
		})
		expect(table.store.state.columnPinning.start).toEqual(['name', 'age'])
	})

	it('a static pin survives an initialState.columnPinning that omits it', () => {
		const table = createTable({
			features: COLUMN_PINNING,
			data: DATA,
			columns: PINNED_COLUMNS,
			pinning: { column: true },
			initialState: { columnPinning: { start: ['age'], end: [] } },
		})
		expect(table.store.state.columnPinning.start).toContain('name')
	})

	it('initialState.columnPinning does not drop system column pins', () => {
		const table = createTable({
			features: SYSTEM_COLUMN_FEATURES,
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete: () => {} },
			initialState: { columnPinning: { start: [], end: [] } },
		})
		const { start, end } = table.store.state.columnPinning
		expect(start).toContain(SELECTION_COLUMN_ID)
		expect(end).toContain(ACTIONS_COLUMN_ID)
	})

	it('initialState cannot hide a system column', () => {
		const table = createTable({
			features: SYSTEM_COLUMN_FEATURES,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: () => {} },
			visibility: true,
			initialState: { columnVisibility: { [ACTIONS_COLUMN_ID]: false } },
		})
		expect(table.getVisibleLeafColumns().map((c: ColumnLike) => c.id)).toContain(ACTIONS_COLUMN_ID)
	})

	// The one-way mirror `syncControlledState` performed is upstream's job in v9, so the invariant
	// it re-enforced is enforced where every other write is: in `onColumnVisibilityChange`.
	it('a columnVisibility write cannot hide a system column', () => {
		const table = createTable({
			features: SYSTEM_COLUMN_FEATURES,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: () => {} },
			visibility: true,
		})
		table.setColumnVisibility({ [ACTIONS_COLUMN_ID]: false })
		expect(table.getVisibleLeafColumns().map((c: ColumnLike) => c.id)).toContain(ACTIONS_COLUMN_ID)
	})

	it('a columnPinning write cannot unpin a system column', () => {
		const table = createTable({
			features: SYSTEM_COLUMN_FEATURES,
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete: () => {} },
		})
		table.setColumnPinning({ start: [], end: [] })
		const { start, end } = table.store.state.columnPinning
		expect(start).toContain(SELECTION_COLUMN_ID)
		expect(end).toContain(ACTIONS_COLUMN_ID)
	})

	it('columnVisibility merges per key — a initialHidden column stays hidden', () => {
		const table = createTable({
			features: VISIBILITY,
			data: DATA,
			columns: HIDDEN_COLUMNS,
			visibility: true,
			initialState: { columnVisibility: { age: true } },
		})
		expect(table.store.state.columnVisibility).toMatchObject({ name: false, age: true })
	})
})

describe('createTable — enabled: false', () => {
	const DATA = [{ name: 'Alice', age: 30 }]
	const COLUMNS = createColumns<{ name: string; age: number }>([{ accessorKey: 'name' }, { accessorKey: 'age' }])

	it('sorting: { enabled: false } disables sorting despite the config object', () => {
		const table = createTable({
			features: SORTING,
			data: DATA,
			columns: COLUMNS,
			sorting: { enabled: false, multi: true },
		})
		expect(table.options.enableSorting).toBe(false)
	})

	it('a disabled feature does not contribute its manual flag', () => {
		const table = createTable({
			features: FILTERING,
			data: DATA,
			columns: COLUMNS,
			filtering: { enabled: false, manual: true },
		})
		expect(table.options.manualFiltering).toBeUndefined()
	})

	it('a disabled feature does not contribute its onChange', () => {
		const onChange = vi.fn()
		const table = createTable({
			features: SELECTION,
			data: DATA,
			columns: COLUMNS,
			selection: { enabled: false, onChange },
		})
		table.setRowSelection({ '0': true })
		expect(onChange).not.toHaveBeenCalled()
	})

	it('editing: { enabled: false } keeps the actions column out of the table', () => {
		const table = createTable({
			features: NONE,
			data: DATA,
			columns: COLUMNS,
			editing: { enabled: false, onSave: () => Promise.resolve() },
		})
		expect(columnIds(table)).not.toContain(ACTIONS_COLUMN_ID)
	})

	it('resizing: { enabled: false } leaves column resizing off', () => {
		const table = createTable({
			features: RESIZING,
			data: DATA,
			columns: COLUMNS,
			resizing: { enabled: false, mode: 'onEnd' },
		})
		expect(table.options.enableColumnResizing).toBeFalsy()
	})

	it('an object without enabled turns the feature on', () => {
		const table = createTable({ features: RESIZING, data: DATA, columns: COLUMNS, resizing: { mode: 'onEnd' } })
		expect(table.options.enableColumnResizing).toBe(true)
	})
})

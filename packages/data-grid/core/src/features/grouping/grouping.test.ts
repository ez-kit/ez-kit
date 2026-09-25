import {
	aggregationFns,
	columnGroupingFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createFilteredRowModel,
	createGroupedRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	columnFilteringFeature,
	filterFns,
	rowAggregationFeature,
	rowExpandingFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@tanstack/table-core'
import { describe, expect, it, vi } from 'vitest'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'
import { GROUP_COLUMN_ID } from '../../system-columns'

import { createManualGroupedRowModel } from './create-manual-grouped-row-model'

type Row = { id: string; region: string; manager: string; amount: number; closedAt: string }

const DATA: Row[] = [
	{ id: '1', region: 'EMEA', manager: 'Ivanov', amount: 50, closedAt: '2026-01-14' },
	{ id: '2', region: 'EMEA', manager: 'Ivanov', amount: 30, closedAt: '2026-01-22' },
	{ id: '3', region: 'EMEA', manager: 'Petrova', amount: 20, closedAt: '2026-02-03' },
	{ id: '4', region: 'APAC', manager: 'Chen', amount: 100, closedAt: '2026-02-11' },
]

const COLUMNS = createColumns<Row>([
	{ accessorKey: 'region' },
	{ accessorKey: 'manager' },
	{ accessorKey: 'amount', aggregation: 'sum' },
])

// ── feature sets ──────────────────────────────────────────────────────────────
// Grouping always carries expansion: a group row is a row with `subRows`, and it is
// `rowExpandingFeature` + `expandedRowModel` that open it. `aggregationFns` rides along wherever a
// column names an aggregation by string, for the reason `sortFns` does in the sorting suites —
// without it the name resolves to nothing and the subtotal is silently `undefined`.

/** Grouping and aggregation together — the common case. */
const GROUPING = tableFeatures({
	columnGroupingFeature,
	groupedRowModel: createGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
	rowAggregationFeature,
	aggregationFns,
})

/** Plus column visibility, which is what `getVisibleLeafColumns` needs to answer. */
const GROUPING_VISIBLE = tableFeatures({
	columnGroupingFeature,
	groupedRowModel: createGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
	rowAggregationFeature,
	aggregationFns,
	columnVisibilityFeature,
})

/** Aggregation **without** grouping — the footer grand total, and the point of the split. */
const AGGREGATION_ONLY = tableFeatures({ rowAggregationFeature, aggregationFns })

/** Plus pagination, for the case where a page ends mid-group. */
const GROUPING_PAGED = tableFeatures({
	columnGroupingFeature,
	groupedRowModel: createGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
	rowAggregationFeature,
	aggregationFns,
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel(),
})

/** Plus sorting, which orders within groups. */
const GROUPING_SORTED = tableFeatures({
	columnGroupingFeature,
	groupedRowModel: createGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
	rowAggregationFeature,
	aggregationFns,
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns,
})

/** Plus selection, for the cascade from a group row to its leaves. */
const GROUPING_SELECTED = tableFeatures({
	columnGroupingFeature,
	groupedRowModel: createGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
	rowAggregationFeature,
	aggregationFns,
	rowSelectionFeature,
})

/** Plus column filtering, which runs before grouping so the groups recompute. */
const GROUPING_FILTERED = tableFeatures({
	columnGroupingFeature,
	groupedRowModel: createGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
	rowAggregationFeature,
	aggregationFns,
	columnFilteringFeature,
	filteredRowModel: createFilteredRowModel(),
	filterFns,
})

/**
 * The server-grouping model, for the one test below that writes `grouping.getSubRows` — a tree
 * response the rows already arrive nested in. `createGroupedRowModel()` (the `GROUPING` set above)
 * groups its own input from scratch and does not read `getSubRows` at all, so pairing it with a
 * tree reader means the client groups an already-grouped tree a second time; the mismatch guard in
 * `create-table-options.ts` warns on exactly this pairing now that `createManualGroupedRowModel()`
 * exists to be the correct one.
 */
const MANUAL_GROUPING = tableFeatures({
	columnGroupingFeature,
	groupedRowModel: createManualGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})

/**
 * Descendants of a row, counted through `subRows`.
 *
 * Never off `getRowModel().rows`, which is render order and mixes group rows with leaf rows —
 * upstream flags reading a group's size off it as the single commonest grouping mistake.
 */
function leafCount(row: { subRows: { subRows: unknown[] }[] }): number {
	if (row.subRows.length === 0) return 1

	return row.subRows.reduce((sum, sub) => sum + leafCount(sub as Parameters<typeof leafCount>[0]), 0)
}

describe('row grouping', () => {
	it('groups by one column, one group row per distinct value', () => {
		const table = createTable({
			features: GROUPING,
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region'] },
		})

		const rows = table.getRowModel().rows
		expect(rows).toHaveLength(2)
		expect(rows.map((r) => r.getGroupingValue('region'))).toEqual(['EMEA', 'APAC'])
		expect(rows.map(leafCount)).toEqual([3, 1])
	})

	it('groups by two columns, outermost first', () => {
		const table = createTable({
			features: GROUPING,
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region', 'manager'] },
		})

		const [emea] = table.getRowModel().rows
		expect(emea?.getGroupingValue('region')).toBe('EMEA')
		expect(emea?.subRows.map((r) => r.getGroupingValue('manager'))).toEqual(['Ivanov', 'Petrova'])
		expect(emea?.subRows.map(leafCount)).toEqual([2, 1])
	})

	it('derives the grouping key from `grouping.getValue`', () => {
		const byMonth = createColumns<Row>([
			{ accessorKey: 'region' },
			{ accessorKey: 'closedAt', grouping: { getValue: (row) => row.closedAt.slice(0, 7) } },
		])
		const table = createTable({
			features: GROUPING,
			data: DATA,
			columns: byMonth,
			grouping: { by: ['closedAt'] },
		})

		expect(table.getRowModel().rows.map((r) => r.getGroupingValue('closedAt'))).toEqual(['2026-01', '2026-02'])
	})

	it('`grouping: false` takes a column out of the groupable set', () => {
		const locked = createColumns<Row>([{ accessorKey: 'region', grouping: false }, { accessorKey: 'manager' }])
		const table = createTable({ features: GROUPING, data: DATA, columns: locked, grouping: true })

		expect(table.getColumn('region')?.getCanGroup()).toBe(false)
		expect(table.getColumn('manager')?.getCanGroup()).toBe(true)
	})

	it('`grouping: false` on the table takes every column out of the groupable set', () => {
		const table = createTable({ features: GROUPING, data: DATA, columns: COLUMNS })

		expect(table.getColumn('region')?.getCanGroup()).toBe(false)
	})

	it('takes the grouped column out of the column list and puts it back on ungroup', () => {
		const table = createTable({
			features: GROUPING_VISIBLE,
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region'] },
		})

		const visible = (): string[] => table.getVisibleLeafColumns().map((c) => c.id)
		expect(visible()).not.toContain('region')

		table.setGrouping([])
		expect(visible()).toContain('region')
	})

	it('injects `__group__` when grouping is configured, and not otherwise', () => {
		const grouped = createTable({ features: GROUPING, data: DATA, columns: COLUMNS, grouping: true })
		const plain = createTable({ features: GROUPING, data: DATA, columns: COLUMNS })

		expect(grouped.getAllLeafColumns().map((c) => c.id)).toContain(GROUP_COLUMN_ID)
		expect(plain.getAllLeafColumns().map((c) => c.id)).not.toContain(GROUP_COLUMN_ID)
	})

	it('seeds the levels from `grouping.by`', () => {
		const table = createTable({
			features: GROUPING,
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region', 'manager'] },
		})

		expect(table.store.state.grouping).toEqual(['region', 'manager'])
	})

	it('lets `initialState.grouping` win over `grouping.by`, and says so in development', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const table = createTable({
			features: GROUPING,
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region'] },
			initialState: { grouping: ['manager'] },
		})

		expect(table.store.state.grouping).toEqual(['manager'])
		expect(warn.mock.calls.flat().join(' ')).toContain('Both `grouping.by`')
		warn.mockRestore()
	})

	it('reports each change through `grouping.onChange`', () => {
		const onChange = vi.fn()
		const table = createTable({ features: GROUPING, data: DATA, columns: COLUMNS, grouping: { onChange } })

		table.setGrouping(['region'])

		expect(onChange).toHaveBeenCalledWith(['region'])
	})

	it('builds the tree from `grouping.getSubRows` without an expanding config', () => {
		type ServerRow = { id: string; region: string; amount: number; subRows?: ServerRow[] }
		const table = createTable({
			features: MANUAL_GROUPING,
			data: [
				{ id: 'g:EMEA', region: 'EMEA', amount: 100, subRows: [{ id: '1', region: 'EMEA', amount: 100 }] },
			] satisfies ServerRow[],
			columns: createColumns<ServerRow>([{ accessorKey: 'region' }, { accessorKey: 'amount' }]),
			grouping: { by: ['region'], getSubRows: (row) => row.subRows },
			getRowId: (row) => row.id,
		})

		expect(table.getCoreRowModel().rows[0]?.subRows).toHaveLength(1)
		// No `expanding` config, so no `__expand__` column is injected.
		expect(table.getAllColumns().map((column) => column.id)).not.toContain('__expand__')
	})
})

describe('row aggregation', () => {
	it('totals a column on its group rows', () => {
		const table = createTable({
			features: GROUPING,
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region'] },
		})

		expect(table.getRowModel().rows.map((r) => r.getValue('amount'))).toEqual([100, 100])
	})

	const CASES: [string, unknown][] = [
		['sum', 100],
		['mean', 100 / 3],
		['median', 30],
		['min', 20],
		['max', 50],
		['extent', [20, 50]],
		['count', 3],
		['uniqueCount', 3],
		['unique', [50, 30, 20]],
		['first', 50],
		['last', 20],
	]

	it.each(CASES)('applies the built-in `%s` aggregation', (fn, expected) => {
		const columns = createColumns<Row>([{ accessorKey: 'region' }, { accessorKey: 'amount', aggregation: fn }])
		const table = createTable({ features: GROUPING, data: DATA, columns, grouping: { by: ['region'] } })

		expect(table.getRowModel().rows[0]?.getValue('amount')).toEqual(expected)
	})

	it('accepts the object form and carries the renderer on meta', () => {
		const component = () => null
		const columns = createColumns<Row>([
			{ accessorKey: 'region' },
			{ accessorKey: 'amount', aggregation: { fn: 'sum', component } },
		])
		const table = createTable({ features: GROUPING, data: DATA, columns, grouping: { by: ['region'] } })

		expect(table.getRowModel().rows[0]?.getValue('amount')).toBe(100)
		expect(table.getColumn('amount')?.columnDef.meta?.aggregation?.component).toBe(component)
	})

	it('produces a grand total with no grouping registered at all', () => {
		// No `columnGroupingFeature`, no grouped row model, no `grouping` config — the split the
		// two features exist for. Upstream's guidance leads with registering grouping merely to
		// total a column being the mistake.
		const table = createTable({ features: AGGREGATION_ONLY, data: DATA, columns: COLUMNS })

		expect(table.getColumn('amount')?.getAggregationValue()).toBe(200)
		expect(table.getRowModel().rows).toHaveLength(DATA.length)
	})
})

describe('grouping beside other features', () => {
	it('counts group rows against the page, so a page can end mid-group', () => {
		// Upstream behaviour, and both commercial grids share it. Asserted rather than worked
		// around so a later "fix" has to argue with a test.
		const table = createTable({
			features: GROUPING_PAGED,
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region'] },
			pagination: { pageSize: 1 },
		})

		const rows = table.getRowModel().rows
		expect(rows).toHaveLength(1)
		expect(rows[0]?.getGroupingValue('region')).toBe('EMEA')
	})

	it('orders group rows by their grouping value when the grouped column sorts', () => {
		const table = createTable({
			features: GROUPING_SORTED,
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region'] },
			sorting: true,
			initialState: { sorting: [{ id: 'region', desc: false }] },
		})

		expect(table.getRowModel().rows.map((r) => r.getGroupingValue('region'))).toEqual(['APAC', 'EMEA'])
	})

	it('cascades selection from a group row to every leaf under it', () => {
		const table = createTable({
			features: GROUPING_SELECTED,
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region'] },
			selection: true,
		})

		const [emea] = table.getRowModel().rows
		emea?.toggleSelected(true)

		expect(emea?.getIsAllSubRowsSelected()).toBe(true)
		expect(table.getSelectedRowModel().flatRows.filter((r) => r.subRows.length === 0)).toHaveLength(3)
	})

	it('reports a partly selected group as neither selected nor unselected', () => {
		const table = createTable({
			features: GROUPING_SELECTED,
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region'] },
			selection: true,
		})

		const [emea] = table.getRowModel().rows
		emea?.subRows[0]?.toggleSelected(true)

		expect(emea?.getIsAllSubRowsSelected()).toBe(false)
		expect(emea?.getIsSomeSelected()).toBe(true)
	})

	it('recomputes the groups behind an active filter', () => {
		const table = createTable({
			features: GROUPING_FILTERED,
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region'] },
			filtering: true,
			initialState: { columnFilters: [{ id: 'region', value: 'APAC' }] },
		})

		const rows = table.getRowModel().rows
		expect(rows).toHaveLength(1)
		expect(rows[0]?.getValue('amount')).toBe(100)
	})
})

describe('grouping edge cases', () => {
	it('renders no rows for empty data with grouping on', () => {
		const table = createTable({
			features: GROUPING,
			data: [],
			columns: COLUMNS,
			grouping: { by: ['region'] },
		})

		expect(table.getRowModel().rows).toHaveLength(0)
	})

	it('makes one group when every row shares a value', () => {
		const table = createTable({
			features: GROUPING,
			data: DATA.filter((row) => row.region === 'EMEA'),
			columns: COLUMNS,
			grouping: { by: ['region'] },
		})

		expect(table.getRowModel().rows).toHaveLength(1)
	})

	it('makes a group of one for a value only one row holds', () => {
		const table = createTable({
			features: GROUPING,
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region'] },
		})

		const apac = table.getRowModel().rows[1]
		expect(leafCount(apac as Parameters<typeof leafCount>[0])).toBe(1)
		expect(apac?.getValue('amount')).toBe(100)
	})

	it('groups rows whose grouping value is null or undefined rather than dropping them', () => {
		type Sparse = { id: string; region: string | null; amount: number }
		const sparse: Sparse[] = [
			{ id: '1', region: null, amount: 10 },
			{ id: '2', region: null, amount: 5 },
			{ id: '3', region: 'EMEA', amount: 1 },
		]
		const columns = createColumns<Sparse>([{ accessorKey: 'region' }, { accessorKey: 'amount', aggregation: 'sum' }])
		const table = createTable({ features: GROUPING, data: sparse, columns, grouping: { by: ['region'] } })

		const rows = table.getRowModel().rows
		expect(rows).toHaveLength(2)
		expect(rows.reduce((sum, r) => sum + leafCount(r), 0)).toBe(sparse.length)
	})
})

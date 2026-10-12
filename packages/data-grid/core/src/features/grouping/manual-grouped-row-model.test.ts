import { columnGroupingFeature, createExpandedRowModel, rowExpandingFeature, tableFeatures } from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'

import { createManualGroupedRowModel } from './create-manual-grouped-row-model'

type ServerRow = {
	id: string
	region?: string
	manager?: string
	account?: string
	amount?: number
	closedAt?: string
	subRows?: ServerRow[] | undefined
}

// Named so the tests below can reuse the EMEA branch without a `TREE[0]` index access — that
// would need a non-null assertion under `noUncheckedIndexedAccess`, which this repo's lint bans.
const EMEA_SUBROWS: ServerRow[] = [
	{ id: '1', region: 'EMEA', manager: 'Ivanov', account: 'Acme', amount: 70 },
	{ id: '2', region: 'EMEA', manager: 'Ivanov', account: 'Globex', amount: 30 },
]

const EMEA_GROUP: ServerRow = { id: 'g:EMEA', region: 'EMEA', amount: 100, subRows: EMEA_SUBROWS }

const APAC_GROUP: ServerRow = {
	id: 'g:APAC',
	region: 'APAC',
	amount: 100,
	subRows: [{ id: '3', region: 'APAC', account: 'Umbrella', amount: 100 }],
}

const TREE: ServerRow[] = [EMEA_GROUP, APAC_GROUP]

// Shared by the two-level tests below, for the same reason `EMEA_SUBROWS` is shared: one named
// fixture instead of a `TREE[0]`-style index access repeated at each call site.
const TWO_LEVEL: ServerRow[] = [
	{
		id: 'g:EMEA',
		region: 'EMEA',
		amount: 100,
		subRows: [{ id: 'g:EMEA>Ivanov', manager: 'Ivanov', amount: 100, subRows: EMEA_SUBROWS }],
	},
]

const COLUMNS = createColumns<ServerRow>([
	{ accessorKey: 'region' },
	{ accessorKey: 'manager' },
	{ accessorKey: 'account' },
	{ accessorKey: 'amount' },
])

const MANUAL = tableFeatures({
	columnGroupingFeature,
	groupedRowModel: createManualGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})

const build = (data: ServerRow[], by: string[]) =>
	createTable({
		features: MANUAL,
		data,
		columns: COLUMNS,
		grouping: { by, getSubRows: (row) => row.subRows },
		getRowId: (row) => row.id,
	})

describe('the manual grouped row model, tree shape', () => {
	it('marks the top level as group rows and leaves the leaves alone', () => {
		const rows = build(TREE, ['region']).getRowModel().rows

		expect(rows).toHaveLength(2)
		expect(rows[0]?.getIsGrouped()).toBe(true)
		expect(rows[0]?.groupingColumnId).toBe('region')
		expect(rows[0]?.groupingValue).toBe('EMEA')
		expect(rows[0]?.subRows[0]?.getIsGrouped()).toBe(false)
	})

	it('returns the server value for an aggregated column and computes nothing', () => {
		// The leaves happen to sum to 100 as well, so the distinction is only visible on a group
		// row whose field disagrees with its children.
		const tampered: ServerRow[] = [{ ...EMEA_GROUP, amount: 999 }]

		expect(build(TREE, ['region']).getRowModel().rows[0]?.getValue('amount')).toBe(100)
		expect(build(tampered, ['region']).getRowModel().rows[0]?.getValue('amount')).toBe(999)
	})

	it('reads empty rather than a computed total when the server omitted the field', () => {
		const withoutTotal: ServerRow[] = [{ id: 'g:EMEA', region: 'EMEA', subRows: EMEA_SUBROWS }]

		expect(build(withoutTotal, ['region']).getRowModel().rows[0]?.getValue('amount')).toBeUndefined()
	})

	it('counts the leaves beneath a group', () => {
		const rows = build(TREE, ['region']).getRowModel().rows

		expect(rows[0]?.getLeafRows()).toHaveLength(2)
		expect(rows[1]?.getLeafRows()).toHaveLength(1)
	})

	it('treats rows deeper than `by.length` as records', () => {
		const nested: ServerRow[] = [
			{
				id: 'g:EMEA',
				region: 'EMEA',
				amount: 100,
				subRows: [{ id: '1', region: 'EMEA', account: 'Acme', amount: 70, subRows: [{ id: '1a', amount: 70 }] }],
			},
		]
		const group = build(nested, ['region']).getRowModel().rows[0]

		expect(group?.getIsGrouped()).toBe(true)
		expect(group?.subRows[0]?.getIsGrouped()).toBe(false)
		expect(group?.subRows[0]?.subRows[0]?.getIsGrouped()).toBe(false)
	})

	it('groups two levels, outermost first', () => {
		const group = build(TWO_LEVEL, ['region', 'manager']).getRowModel().rows[0]

		expect(group?.groupingColumnId).toBe('region')
		expect(group?.subRows[0]?.getIsGrouped()).toBe(true)
		expect(group?.subRows[0]?.groupingColumnId).toBe('manager')
		expect(group?.subRows[0]?.groupingValue).toBe('Ivanov')
		// 3, not 2: `Row.getLeafRows()` is a stock method (`coreRowsFeature`) that always recomputes
		// `flattenBy(row.subRows, …)` and returns every descendant — the intermediate `manager` group
		// row plus the 2 deals beneath it — rather than reading this model's `leafRows` property.
		// Stock `createGroupedRowModel()` does the same for an identical two-level shape (verified
		// with a throwaway test against it), so this is upstream's behaviour, not a defect here.
		expect(group?.getLeafRows()).toHaveLength(3)
	})

	it('the `leafRows` property holds only the childless descendants, unlike `getLeafRows()`', () => {
		const group = build(TWO_LEVEL, ['region', 'manager']).getRowModel().rows[0]

		// `leafRows` is this model's own internal mark, not a typed member of `Row` anywhere (see
		// the model's own docblock), hence the cast rather than a direct property read.
		const marked = group as unknown as { leafRows?: unknown[] }
		expect(marked.leafRows).toHaveLength(2)
		expect(group?.getLeafRows()).toHaveLength(3)
	})

	it('leaves a childless top-level row as a record', () => {
		const flatOnly: ServerRow[] = [{ id: '1', region: 'EMEA', account: 'Acme', amount: 70 }]

		expect(build(flatOnly, ['region']).getRowModel().rows[0]?.getIsGrouped()).toBe(false)
	})

	it('treats a grouping level as absent once its column is gone, rather than marking with a stale id', () => {
		// 'gone' names no column in COLUMNS, so `levels` filters it out entirely (mirroring
		// upstream's own filter) and the top level has no columnId left to mark with — the row
		// keeps its own shape (still has subRows) but is demoted to a record rather than grouped
		// under a column id nothing declares any more.
		const table = build(TREE, ['gone'])
		const outer = table.getRowModel().rows[0]

		expect(outer?.getIsGrouped()).toBe(false)
		expect(outer?.groupingColumnId).toBeUndefined()
		expect(outer?.subRows).toHaveLength(2)
	})

	it('clears stale marks when `grouping.by` shrinks, and clears every mark when it empties', () => {
		const table = createTable({
			features: MANUAL,
			data: TWO_LEVEL,
			columns: COLUMNS,
			grouping: { by: ['region', 'manager'], getSubRows: (row) => row.subRows },
			getRowId: (row) => row.id,
		})

		const outerBefore = table.getRowModel().rows[0]
		const innerBefore = outerBefore?.subRows[0]
		expect(outerBefore?.getIsGrouped()).toBe(true)
		expect(innerBefore?.getIsGrouped()).toBe(true)

		// Shrinking `by` re-runs the model over the SAME `Row` objects (the core row model is
		// memoised on `table.options.data` alone) — the inner `manager` row is no longer inside
		// `by` and must demote back to a record rather than keep its stale marks.
		table.setGrouping(['region'])
		const outerAfterShrink = table.getRowModel().rows[0]
		const innerAfterShrink = outerAfterShrink?.subRows[0]
		expect(outerAfterShrink?.getIsGrouped()).toBe(true)
		expect(innerAfterShrink?.getIsGrouped()).toBe(false)
		expect(innerAfterShrink?.groupingColumnId).toBeUndefined()

		// Emptying `by` altogether must leave no mark anywhere in the tree, including the outer row.
		table.setGrouping([])
		for (const row of table.getRowModel().flatRows) {
			expect(row.getIsGrouped(), row.id).toBe(false)
			expect(row.groupingColumnId, row.id).toBeUndefined()
		}
	})

	it('derives the grouping key from `grouping.getValue`, mirroring client grouping', () => {
		const byMonth = createColumns<ServerRow>([
			{ accessorKey: 'region' },
			{ accessorKey: 'account' },
			{ accessorKey: 'amount' },
			{ accessorKey: 'closedAt', grouping: { getValue: (row) => row.closedAt?.slice(0, 7) } },
		])
		const monthly: ServerRow[] = [
			{
				id: 'g:2026-01',
				closedAt: '2026-01-14',
				subRows: [
					{ id: '1', closedAt: '2026-01-14', amount: 50 },
					{ id: '2', closedAt: '2026-01-22', amount: 30 },
				],
			},
		]
		const table = createTable({
			features: MANUAL,
			data: monthly,
			columns: byMonth,
			grouping: { by: ['closedAt'], getSubRows: (row) => row.subRows },
			getRowId: (row) => row.id,
		})

		// The raw field is '2026-01-14'; the bucketed grouping key is '2026-01'.
		expect(table.getRowModel().rows[0]?.groupingValue).toBe('2026-01')
	})
})

describe('the manual grouped row model, flat shape', () => {
	type FlatRow = { id: string; level: number; region?: string; account?: string; amount?: number }

	const FLAT: FlatRow[] = [
		{ id: 'g:EMEA', level: 0, region: 'EMEA', amount: 100 },
		{ id: '1', level: 1, region: 'EMEA', account: 'Acme', amount: 70 },
		{ id: '2', level: 1, region: 'EMEA', account: 'Globex', amount: 30 },
		{ id: 'g:APAC', level: 0, region: 'APAC', amount: 100 },
		{ id: '3', level: 1, region: 'APAC', account: 'Umbrella', amount: 100 },
	]

	const FLAT_FEATURES = tableFeatures({
		columnGroupingFeature,
		groupedRowModel: createManualGroupedRowModel({
			isGroupRow: (row: FlatRow) => row.level === 0,
			getLevel: (row: FlatRow) => row.level,
		}),
		rowExpandingFeature,
		expandedRowModel: createExpandedRowModel(),
	})

	const buildFlat = (data: FlatRow[]) =>
		createTable({
			features: FLAT_FEATURES,
			data,
			columns: createColumns<FlatRow>([
				{ accessorKey: 'region' },
				{ accessorKey: 'account' },
				{ accessorKey: 'amount' },
			]),
			grouping: { by: ['region'] },
			getRowId: (row) => row.id,
		})

	it('folds the sequence into groups and their records', () => {
		const rows = buildFlat(FLAT).getRowModel().rows

		expect(rows).toHaveLength(2)
		expect(rows[0]?.getIsGrouped()).toBe(true)
		expect(rows[0]?.groupingValue).toBe('EMEA')
		expect(rows[0]?.subRows.map((row) => row.id)).toEqual(['1', '2'])
		expect(rows[1]?.subRows.map((row) => row.id)).toEqual(['3'])
	})

	it('reads the subtotal off the group row rather than computing it', () => {
		expect(buildFlat(FLAT).getRowModel().rows[0]?.getValue('amount')).toBe(100)
	})

	it('sets depth and parent on the folded records', () => {
		const group = buildFlat(FLAT).getRowModel().rows[0]

		expect(group?.depth).toBe(0)
		expect(group?.subRows[0]?.depth).toBe(1)
		expect(group?.subRows[0]?.parentId).toBe('g:EMEA')
	})

	it('throws in development on a level that jumps by more than one', () => {
		expect(() =>
			buildFlat([
				{ id: 'g:EMEA', level: 0, region: 'EMEA' },
				{ id: '1', level: 2, account: 'Acme' },
			]).getRowModel(),
		).toThrow(/level/i)
	})

	it('keeps a record that arrives before any group row at the top level', () => {
		const rows = buildFlat([{ id: '1', level: 1, account: 'Acme', amount: 70 }]).getRowModel().rows

		expect(rows).toHaveLength(1)
		expect(rows[0]?.getIsGrouped()).toBe(false)
	})

	it('folds the same tree on a rerun over the same rows, rather than doubling it', () => {
		// The core row model is memoised on `data` alone, so `grouping.by` staying the same across
		// a `setGrouping` call still reruns this model over the SAME `Row` objects it already
		// folded once. `foldByLevel` resets each row's `subRows` before rebuilding it, so a second
		// run must produce an identical tree rather than duplicate or orphaned rows.
		const table = buildFlat(FLAT)

		const first = table.getRowModel().rows
		expect(first).toHaveLength(2)
		expect(first[0]?.subRows.map((row) => row.id)).toEqual(['1', '2'])
		expect(first[1]?.subRows.map((row) => row.id)).toEqual(['3'])

		// Force the memoised row model to recompute without changing `data` or `grouping.by`.
		table.setGrouping(['region'])
		const second = table.getRowModel().rows

		expect(second).toHaveLength(2)
		expect(second[0]?.id).toBe('g:EMEA')
		expect(second[0]?.subRows.map((row) => row.id)).toEqual(['1', '2'])
		expect(second[1]?.id).toBe('g:APAC')
		expect(second[1]?.subRows.map((row) => row.id)).toEqual(['3'])
		expect(second[0]?.getLeafRows()).toHaveLength(2)
	})
})

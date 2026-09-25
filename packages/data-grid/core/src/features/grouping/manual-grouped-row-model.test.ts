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
		const twoLevel: ServerRow[] = [
			{
				id: 'g:EMEA',
				region: 'EMEA',
				amount: 100,
				subRows: [{ id: 'g:EMEA>Ivanov', manager: 'Ivanov', amount: 100, subRows: EMEA_SUBROWS }],
			},
		]
		const group = build(twoLevel, ['region', 'manager']).getRowModel().rows[0]

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

	it('leaves a childless top-level row as a record', () => {
		const flatOnly: ServerRow[] = [{ id: '1', region: 'EMEA', account: 'Acme', amount: 70 }]

		expect(build(flatOnly, ['region']).getRowModel().rows[0]?.getIsGrouped()).toBe(false)
	})
})

import {
	columnFilteringFeature,
	createFilteredRowModel,
	filterFn_includesString,
	filterFn_inNumberRange,
	filterFns,
	tableFeatures,
} from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { createColumns, createTable } from '../index'

import { withScalarRangeFilters } from './scalar-range-filters'

/**
 * A column with no operators keeps TanStack's `'auto'`, which picks `inNumberRange` for numbers and
 * `inDateRange` for `Date`s — both written for a `[min, max]` tuple. The plain filter control of a
 * number or a date column hands back one value, and the two used to destructure it and throw.
 */

const FILTERING = tableFeatures({ columnFilteringFeature, filteredRowModel: createFilteredRowModel(), filterFns })

type Row = { id: number; salary: number; joinedAt: Date }

const ROWS: Row[] = [
	{ id: 1, salary: 60000, joinedAt: new Date('2021-03-15') },
	{ id: 2, salary: 90000, joinedAt: new Date('2022-01-10') },
	{ id: 3, salary: 120000, joinedAt: new Date('2023-07-01') },
]

const COLUMNS = createColumns<Row>([
	{ accessorKey: 'salary', header: 'Salary' },
	{ accessorKey: 'joinedAt', header: 'Joined' },
])

function filteredIds(columnFilters: { id: string; value: unknown }[]): number[] {
	const table = createTable({
		features: FILTERING,
		data: ROWS,
		columns: COLUMNS,
		filtering: true,
		initialState: { columnFilters },
	})
	return table.getRowModel().rows.map((row) => row.original.id)
}

describe('a range filter function given one value', () => {
	it('matches a number column on that value instead of throwing', () => {
		expect(filteredIds([{ id: 'salary', value: 90000 }])).toEqual([2])
	})

	it('reads a numeric string the way the range form reads its ends', () => {
		expect(filteredIds([{ id: 'salary', value: '120000' }])).toEqual([3])
	})

	it('matches a date column on that instant instead of throwing', () => {
		expect(filteredIds([{ id: 'joinedAt', value: '2022-01-10' }])).toEqual([2])
	})

	it('still reads a [min, max] tuple as a range', () => {
		expect(filteredIds([{ id: 'salary', value: [70000, 130000] }])).toEqual([2, 3])
		expect(filteredIds([{ id: 'joinedAt', value: ['2021-01-01', '2022-12-31'] }])).toEqual([1, 2])
	})
})

describe('withScalarRangeFilters', () => {
	it('returns the same object for the same feature set', () => {
		expect(withScalarRangeFilters(FILTERING)).toBe(withScalarRangeFilters(FILTERING))
	})

	it('returns a set without `filterFns` untouched', () => {
		const bare = tableFeatures({ columnFilteringFeature })
		expect(withScalarRangeFilters(bare)).toBe(bare)
	})

	it('leaves every other registered filter function as it was', () => {
		const wrapped = withScalarRangeFilters(FILTERING) as unknown as { filterFns: Record<string, unknown> }
		expect(wrapped.filterFns.includesString).toBe(filterFn_includesString)
		expect(wrapped.filterFns.inNumberRange).not.toBe(filterFn_inNumberRange)
	})
})

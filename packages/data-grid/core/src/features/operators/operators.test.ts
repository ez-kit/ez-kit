import { describe, expect, it, vi } from 'vitest'

import {
	DATE_RANGE_PRESETS,
	OperatorInput,
	createOperatorFilterFn,
	isEmptyOperatorValue,
	resolveColumnOperators,
} from './operators'

import type { BetweenValue, FilterOperatorDef } from './operators'

const contains: FilterOperatorDef<string> = {
	id: 'contains',
	label: 'Contains',
	input: OperatorInput.Single,
	filterFn: (rowValue, value) => String(rowValue).includes(value),
}
const equals: FilterOperatorDef<string> = {
	id: 'equals',
	label: 'Equals',
	input: OperatorInput.Single,
	filterFn: (rowValue, value) => rowValue === value,
}
const TEXT_SET: FilterOperatorDef[] = [contains, equals]

const row = (value: unknown) => ({ getValue: () => value })

describe('resolveColumnOperators', () => {
	it('returns the cell type’s set by reference for `true`', () => {
		expect(resolveColumnOperators(true, TEXT_SET)).toBe(TEXT_SET)
	})

	it('returns nothing for `true` when the cell type has no set', () => {
		expect(resolveColumnOperators(true, undefined)).toEqual([])
	})

	it('narrows the set to the ids a column lists, in the column’s order', () => {
		expect(resolveColumnOperators({ items: ['equals', 'contains'] }, TEXT_SET)).toEqual([equals, contains])
	})

	it('uses a definition in `items` as written, beside ids from the set', () => {
		const fuzzy: FilterOperatorDef = { id: 'fuzzy', label: 'Fuzzy', input: OperatorInput.Single, filterFn: () => true }

		expect(resolveColumnOperators({ items: ['contains', fuzzy] }, TEXT_SET)).toEqual([contains, fuzzy])
	})

	it('looks a string up only in the column’s own set, and warns with the column and the id', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const [stub] = resolveColumnOperators({ items: ['between'] }, TEXT_SET, 'name', 'text')

		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/"name".*"between"/))
		expect(stub?.id).toBe('between')
		expect(stub && createOperatorFilterFn([stub])(row('x'), 'name', { operator: 'between', value: 'y' })).toBe(true)
		warn.mockRestore()
	})
})

describe('createOperatorFilterFn', () => {
	it('never calls a value-taking operator with an empty value', () => {
		const filterFn = vi.fn(() => false)
		const notBetween: FilterOperatorDef<number> = {
			id: 'notBetween',
			label: 'Not between',
			input: OperatorInput.Range,
			filterFn,
		}
		const fn = createOperatorFilterFn([notBetween])

		for (const value of [undefined, null, '', [], {}, { from: '', to: undefined }]) {
			expect(fn(row(5), 'amount', { operator: 'notBetween', value })).toBe(true)
		}
		expect(filterFn).not.toHaveBeenCalled()
	})

	it('calls an operator with no value for every row', () => {
		const filterFn = vi.fn((rowValue: unknown) => rowValue == null)
		const isEmpty: FilterOperatorDef = { id: 'isEmpty', label: 'Is empty', input: OperatorInput.None, filterFn }
		const fn = createOperatorFilterFn([isEmpty])

		expect(fn(row(null), 'email', { operator: 'isEmpty' })).toBe(true)
		expect(fn(row('a@b.c'), 'email', { operator: 'isEmpty' })).toBe(false)
		expect(filterFn).toHaveBeenCalledTimes(2)
	})

	it('hands a range operator the range as written', () => {
		const filterFn = vi.fn((rowValue: unknown, { from, to }: BetweenValue<number>) => {
			const n = Number(rowValue)
			return (from !== undefined && n < from) || (to !== undefined && n > to)
		})
		const notBetween: FilterOperatorDef<number> = {
			id: 'notBetween',
			label: 'Not between',
			input: OperatorInput.Range,
			filterFn,
		}
		const fn = createOperatorFilterFn([notBetween])

		expect(fn(row(5), 'amount', { operator: 'notBetween', value: { from: 10, to: 20 } })).toBe(true)
		expect(fn(row(15), 'amount', { operator: 'notBetween', value: { from: 10, to: 20 } })).toBe(false)
		expect(filterFn).toHaveBeenCalledWith(5, { from: 10, to: 20 })
	})

	it('hands a list operator the array as written', () => {
		const filterFn = vi.fn((rowValue: unknown, values: readonly string[]) => !values.includes(String(rowValue)))
		const excludesAny: FilterOperatorDef<string> = {
			id: 'excludesAny',
			label: 'Excludes any',
			input: OperatorInput.List,
			filterFn,
		}
		const fn = createOperatorFilterFn([excludesAny])

		expect(fn(row('c'), 'status', { operator: 'excludesAny', value: ['a', 'b'] })).toBe(true)
		expect(filterFn).toHaveBeenCalledWith('c', ['a', 'b'])
	})

	it('never hands a value of the wrong shape to an operator', () => {
		const list = vi.fn(() => false)
		const range = vi.fn(() => false)
		const fn = createOperatorFilterFn([
			{ id: 'in', label: 'In', input: OperatorInput.List, filterFn: list },
			{ id: 'between', label: 'Between', input: OperatorInput.Range, filterFn: range },
		])

		expect(fn(row('abc'), 'status', { operator: 'in', value: 'a' })).toBe(true)
		expect(fn(row(5), 'amount', { operator: 'between', value: 7 })).toBe(true)
		expect(list).not.toHaveBeenCalled()
		expect(range).not.toHaveBeenCalled()
	})

	it('passes every row for an operator the column does not offer, warning once for many rows', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		// Rebuilt between the rows, as the column mapper rebuilds it on every React render.
		for (const value of [1, 2, 3, 4]) {
			const fn = createOperatorFilterFn(TEXT_SET, 'amount')
			expect(fn(row(value), 'amount', { operator: 'notBetween', value: { from: 1 } })).toBe(true)
		}

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/"amount".*"notBetween"/))
		warn.mockRestore()
	})
})

describe('isEmptyOperatorValue', () => {
	it('never calls a value of an operator with no input empty', () => {
		expect(isEmptyOperatorValue(OperatorInput.None, undefined)).toBe(false)
	})

	it('calls a range with one bound set non-empty', () => {
		expect(isEmptyOperatorValue(OperatorInput.Range, { from: 1 })).toBe(false)
		expect(isEmptyOperatorValue(OperatorInput.Range, { from: '', to: null })).toBe(true)
	})

	it('treats 0 and false as values, not as empty', () => {
		expect(isEmptyOperatorValue(OperatorInput.Single, 0)).toBe(false)
		expect(isEmptyOperatorValue(OperatorInput.Single, false)).toBe(false)
		expect(isEmptyOperatorValue(OperatorInput.Range, { from: 0 })).toBe(false)
	})

	it('hands 0 and false to the operator', () => {
		const filterFn = vi.fn((rowValue: unknown, value: unknown) => rowValue === value)
		const fn = createOperatorFilterFn([{ id: 'equals', label: 'Equals', input: OperatorInput.Single, filterFn }])

		expect(fn(row(0), 'amount', { operator: 'equals', value: 0 })).toBe(true)
		expect(fn(row(false), 'active', { operator: 'equals', value: false })).toBe(true)
		expect(filterFn).toHaveBeenCalledWith(0, 0)
		expect(filterFn).toHaveBeenCalledWith(false, false)
	})

	it('calls a value of a shape the input cannot take empty', () => {
		expect(isEmptyOperatorValue(OperatorInput.List, 'a')).toBe(true)
		expect(isEmptyOperatorValue(OperatorInput.Range, 7)).toBe(true)
		expect(isEmptyOperatorValue(OperatorInput.Range, [1, 2])).toBe(true)
	})
})

describe('DATE_RANGE_PRESETS', () => {
	// Anchor: 2026-05-14 UTC (a Thursday in mid-month — exercises month/week edges).
	const NOW = new Date('2026-05-14T00:00:00Z')

	const findPreset = (id: string) => {
		const p = DATE_RANGE_PRESETS.find((x) => x.id === id)
		if (!p) throw new Error(`expected preset ${id}`)
		return p
	}

	it('today → { from: today, to: today }', () => {
		expect(findPreset('today').getRange(NOW)).toEqual({ from: '2026-05-14', to: '2026-05-14' })
	})

	it('yesterday → { from: yesterday, to: yesterday }', () => {
		expect(findPreset('yesterday').getRange(NOW)).toEqual({ from: '2026-05-13', to: '2026-05-13' })
	})

	it('last7 → from = 6 days back, to = today (inclusive 7-day window)', () => {
		expect(findPreset('last7').getRange(NOW)).toEqual({ from: '2026-05-08', to: '2026-05-14' })
	})

	it('last30 → from = 29 days back, to = today (inclusive 30-day window)', () => {
		expect(findPreset('last30').getRange(NOW)).toEqual({ from: '2026-04-15', to: '2026-05-14' })
	})

	it('thisMonth → from = first of month, to = last day of month', () => {
		expect(findPreset('thisMonth').getRange(NOW)).toEqual({ from: '2026-05-01', to: '2026-05-31' })
	})

	it('lastMonth → from = first of previous month, to = last day of previous month', () => {
		expect(findPreset('lastMonth').getRange(NOW)).toEqual({ from: '2026-04-01', to: '2026-04-30' })
	})

	it('lastMonth across year boundary (January)', () => {
		const jan = new Date('2026-01-15T00:00:00Z')
		expect(findPreset('lastMonth').getRange(jan)).toEqual({ from: '2025-12-01', to: '2025-12-31' })
	})

	it('built-in preset list has stable id + label per spec', () => {
		expect(DATE_RANGE_PRESETS.map((p) => p.id)).toEqual([
			'today',
			'yesterday',
			'last7',
			'last30',
			'thisMonth',
			'lastMonth',
		])
	})
})

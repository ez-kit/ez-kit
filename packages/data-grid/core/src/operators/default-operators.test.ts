import { columnFilteringFeature, createFilteredRowModel, filterFns, tableFeatures } from '@tanstack/table-core'
import { describe, expect, it, vi } from 'vitest'

import { createTable } from '../create-table'
import { OperatorInput } from '../features/operators'

import { DEFAULT_OPERATOR_ICONS, FilterOperator, defaultOperators } from './entry'

import type { FilterOperatorDef } from '../features/operators'

const BUILT_IN_TYPES = ['text', 'number', 'date', 'boolean', 'select', 'badge', 'progress', 'image', 'link'] as const

function operatorOf(type: keyof typeof defaultOperators.byType, id: string): FilterOperatorDef {
	const op = defaultOperators.byType[type].find((candidate) => candidate.id === id)
	if (!op) throw new Error(`expected "${id}" in the ${type} set`)
	return op
}

/** Calls a definition the way the grid does — with the value its `input` takes. */
function matches(op: FilterOperatorDef, rowValue: unknown, value?: unknown): boolean {
	if (op.input === OperatorInput.None) return op.filterFn(rowValue)
	return (op as { filterFn(rowValue: unknown, value: unknown): boolean }).filterFn(rowValue, value)
}

/**
 * Within the ready-made set the vocabulary is one closed set shared across cell types: the same id
 * means the same comparison everywhere, and only the label changes. It used to be three
 * vocabularies — text `equals` vs number/date `eq` — which is why `defaultOperator: 'equals'` on a
 * number column produced a filter that matched every row.
 */
describe('defaultOperators — one vocabulary across cell types', () => {
	it.each(BUILT_IN_TYPES)('gives %s a non-empty set whose ids are all FilterOperator members', (type) => {
		const members: string[] = Object.values(FilterOperator)
		const set = defaultOperators.byType[type]

		expect(set.length).toBeGreaterThan(0)
		for (const op of set) expect(members, `"${op.id}" is not a FilterOperator member`).toContain(op.id)
	})

	it('spells equality the same way for text, number, date and boolean', () => {
		for (const type of ['text', 'number', 'date', 'boolean'] as const) {
			expect(defaultOperators.byType[type].map((op) => op.id)).toContain(FilterOperator.Equals)
		}
	})

	it('spells comparison the same way for number and date, and only the labels differ', () => {
		expect(operatorOf('number', FilterOperator.GreaterThan).label).toBe('Greater than')
		expect(operatorOf('date', FilterOperator.GreaterThan).label).toBe('After')
	})

	it('opens text with contains, a list type with in, and every other type with its first operator', () => {
		expect(defaultOperators.defaultByType).toEqual({
			text: 'contains',
			image: 'contains',
			link: 'contains',
			select: 'in',
			badge: 'in',
		})
		for (const type of ['number', 'date', 'boolean', 'progress'] as const) {
			expect(defaultOperators.byType[type][0]?.id).toBe(FilterOperator.Equals)
		}
	})

	it('names the input of every definition, ranges and lists included', () => {
		expect(operatorOf('number', FilterOperator.Between).input).toBe(OperatorInput.Range)
		expect(operatorOf('select', FilterOperator.In).input).toBe(OperatorInput.List)
		expect(operatorOf('text', FilterOperator.IsEmpty).input).toBe(OperatorInput.None)
		expect(operatorOf('text', FilterOperator.Contains).input).toBe(OperatorInput.Single)
	})

	it('ships no icons — the control shows the label until a definition names one', () => {
		for (const type of BUILT_IN_TYPES) {
			for (const op of defaultOperators.byType[type]) expect(op.icon).toBeUndefined()
		}
	})
})

describe('the ready-made comparisons', () => {
	it('`in` / `notIn` compare the row value as a string', () => {
		const inOp = operatorOf('select', FilterOperator.In)
		const notIn = operatorOf('select', FilterOperator.NotIn)

		expect(matches(inOp, 'a', ['a', 'b'])).toBe(true)
		expect(matches(inOp, 1, ['1'])).toBe(true)
		expect(matches(inOp, null, ['a'])).toBe(false)
		expect(matches(notIn, 'c', ['a', 'b'])).toBe(true)
	})

	it('`between` leaves an open side open', () => {
		expect(matches(operatorOf('number', FilterOperator.Between), 5, { from: 1 })).toBe(true)
		expect(matches(operatorOf('date', FilterOperator.Between), '2026-05-01', { from: '', to: '2026-04-30' })).toBe(
			false,
		)
	})

	it('`between` on numbers reads an empty bound as open, not as zero', () => {
		const between = operatorOf('number', FilterOperator.Between)

		expect(matches(between, -3, { from: '', to: 5 })).toBe(true)
		expect(matches(between, -3, { from: null, to: 5 })).toBe(true)
		expect(matches(between, 9, { from: 1, to: '' })).toBe(true)
	})

	it('`between` on dates reads a null bound as open', () => {
		expect(matches(operatorOf('date', FilterOperator.Between), '2026-05-01', { from: '2026-01-01', to: null })).toBe(
			true,
		)
	})

	it('text comparisons read a non-string value as its text instead of throwing', () => {
		expect(matches(operatorOf('text', FilterOperator.Contains), 'Room 42', 42)).toBe(true)
		expect(matches(operatorOf('text', FilterOperator.StartsWith), 'Room 42', ['ro'])).toBe(true)
	})

	it('text comparisons ignore case', () => {
		expect(matches(operatorOf('text', FilterOperator.Equals), 'Berlin', 'berlin')).toBe(true)
		expect(matches(operatorOf('text', FilterOperator.EndsWith), 'Berlin', 'LIN')).toBe(true)
	})
})

describe('DEFAULT_OPERATOR_ICONS', () => {
	it('uses one sign per comparison, whatever the cell type calls it', () => {
		expect(DEFAULT_OPERATOR_ICONS).toEqual({
			contains: '*a*',
			startsWith: 'a*',
			endsWith: '*a',
			equals: '=',
			notEquals: '≠',
			greaterThan: '>',
			greaterOrEqual: '≥',
			lessThan: '<',
			lessOrEqual: '≤',
			between: '↔',
			in: '∈',
			notIn: '∉',
			isEmpty: '∅',
			isNotEmpty: '≠∅',
		})
	})
})

type Row = { id: string; total: number; active: boolean; done: number }

/**
 * What an operator-aware column filter needs registered: `columnFilteringFeature` puts
 * `setFilterValue` on a column, `filteredRowModel` drops rows, and `filterFns` resolves the `'auto'`
 * a column without operators carries.
 */
const FILTERING = tableFeatures({
	columnFilteringFeature,
	filteredRowModel: createFilteredRowModel(),
	filterFns,
})

const DATA: Row[] = [
	{ id: '1', total: 10, active: true, done: 10 },
	{ id: '2', total: 20, active: false, done: 90 },
]

describe('the ready-made set actually filters', () => {
	it('`equals` on a number column compares numbers', () => {
		const table = createTable({
			features: FILTERING,
			operators: defaultOperators,
			data: DATA,
			columns: [{ accessorKey: 'total', cell: 'number', filtering: { operators: true } }],
			filtering: true,
		})

		table.getColumn('total')?.setFilterValue({ operator: FilterOperator.Equals, value: 20 })

		expect(table.getRowModel().rows.map((r) => r.original.id)).toEqual(['2'])
	})

	it('`greaterThan` on a progress column compares numbers', () => {
		const table = createTable({
			features: FILTERING,
			operators: defaultOperators,
			data: DATA,
			columns: [{ accessorKey: 'done', cell: 'progress', filtering: { operators: true } }],
			filtering: true,
		})

		table.getColumn('done')?.setFilterValue({ operator: FilterOperator.GreaterThan, value: 50 })

		expect(table.getRowModel().rows.map((r) => r.original.id)).toEqual(['2'])
	})

	it('`equals` on a boolean column compares booleans', () => {
		const table = createTable({
			features: FILTERING,
			operators: defaultOperators,
			data: DATA,
			columns: [{ accessorKey: 'active', cell: 'boolean', filtering: { operators: true } }],
			filtering: true,
		})

		table.getColumn('active')?.setFilterValue({ operator: FilterOperator.Equals, value: false })

		expect(table.getRowModel().rows.map((r) => r.original.id)).toEqual(['2'])
	})

	it('warns when `defaultOperator` names an operator the column does not offer', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		createTable({
			features: FILTERING,
			operators: defaultOperators,
			data: DATA,
			columns: [
				{
					accessorKey: 'total',
					cell: 'number',
					filtering: { operators: true, defaultOperator: FilterOperator.Contains },
				},
			],
			filtering: true,
		})

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('defaultOperator'))
		warn.mockRestore()
	})
})

import { describe, expect, it, vi } from 'vitest'

import { createTable } from '../../create-table'

import {
	BOOLEAN_OPERATORS,
	DATE_OPERATORS,
	DEFAULT_OPERATORS_BY_TYPE,
	DEFAULT_OPERATOR_ID_BY_TYPE,
	FilterOperator,
	NUMBER_OPERATORS,
	TEXT_OPERATORS,
} from './operators'

import type { FilterOperatorDef } from './operators'

/**
 * The operator vocabulary is one closed set shared across cell types: the same id means the
 * same comparison everywhere, and only the label changes. It used to be three vocabularies —
 * text `equals` vs number/date `eq`, number `gt`/`gte` vs date `after`/`onOrAfter` — which is
 * why `defaultOperator: 'equals'` on a number column produced a filter that matched every row.
 */
describe('FilterOperator — one vocabulary across cell types', () => {
	it.each([
		['text', TEXT_OPERATORS as FilterOperatorDef[]],
		['number', NUMBER_OPERATORS as FilterOperatorDef[]],
		['date', DATE_OPERATORS as FilterOperatorDef[]],
		['boolean', BOOLEAN_OPERATORS as FilterOperatorDef[]],
	])('%s operators only use ids from the closed set', (_name, operators) => {
		const members: string[] = Object.values(FilterOperator)
		for (const op of operators) {
			expect(members, `"${op.id}" is not a FilterOperator member`).toContain(op.id)
		}
	})

	it('spells equality the same way for text, number, date and boolean', () => {
		for (const set of [TEXT_OPERATORS, NUMBER_OPERATORS, DATE_OPERATORS, BOOLEAN_OPERATORS]) {
			expect((set as FilterOperatorDef[]).map((op) => op.id)).toContain(FilterOperator.Equals)
		}
	})

	it('spells comparison the same way for number and date, and only the labels differ', () => {
		const number = NUMBER_OPERATORS.find((op) => op.id === FilterOperator.GreaterThan)
		const date = DATE_OPERATORS.find((op) => op.id === FilterOperator.GreaterThan)
		expect(number).toBeDefined()
		expect(date).toBeDefined()
		expect(number?.label).toBe('Greater than')
		expect(date?.label).toBe('After')
	})

	it('gives every built-in cell type a default operator set and a default operator', () => {
		const builtIns = ['text', 'number', 'date', 'boolean', 'select', 'badge', 'progress', 'image', 'link']
		for (const type of builtIns) {
			expect(DEFAULT_OPERATORS_BY_TYPE[type], `${type} has no operator set`).toBeDefined()
			expect(DEFAULT_OPERATORS_BY_TYPE[type]?.length).toBeGreaterThan(0)
			expect(DEFAULT_OPERATOR_ID_BY_TYPE[type], `${type} has no default operator`).toBeDefined()
		}
	})
})

type Row = { id: string; total: number; active: boolean; done: number }

const DATA: Row[] = [
	{ id: '1', total: 10, active: true, done: 10 },
	{ id: '2', total: 20, active: false, done: 90 },
]

describe('operator-aware filtering actually filters', () => {
	it('`equals` on a number column compares numbers', () => {
		const table = createTable<Row>({
			data: DATA,
			columns: [{ accessorKey: 'total', cell: 'number', filtering: { operators: true } }],
			filtering: true,
		})

		table.getColumn('total')?.setFilterValue({ operator: FilterOperator.Equals, value: 20 })

		expect(table.getRowModel().rows.map((r) => r.original.id)).toEqual(['2'])
	})

	it('`greaterThan` on a progress column compares numbers — the type had no operators at all', () => {
		const table = createTable<Row>({
			data: DATA,
			columns: [{ accessorKey: 'done', cell: 'progress', filtering: { operators: true } }],
			filtering: true,
		})

		expect(table.getColumn('done')?.columnDef.meta?.resolvedOperators).toBeDefined()
		table.getColumn('done')?.setFilterValue({ operator: FilterOperator.GreaterThan, value: 50 })

		expect(table.getRowModel().rows.map((r) => r.original.id)).toEqual(['2'])
	})

	it('`equals` on a boolean column compares booleans', () => {
		const table = createTable<Row>({
			data: DATA,
			columns: [{ accessorKey: 'active', cell: 'boolean', filtering: { operators: true } }],
			filtering: true,
		})

		table.getColumn('active')?.setFilterValue({ operator: FilterOperator.Equals, value: false })

		expect(table.getRowModel().rows.map((r) => r.original.id)).toEqual(['2'])
	})
})

describe('development warnings for operator ids that resolve to nothing', () => {
	it('warns when `defaultOperator` names an operator the column does not offer', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		createTable<Row>({
			data: DATA,
			columns: [
				{
					accessorKey: 'total',
					cell: 'number',
					// A perfectly plausible id — it is simply not in the number set.
					filtering: { operators: true, defaultOperator: FilterOperator.Contains },
				},
			],
			filtering: true,
		})

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('defaultOperator'))
		warn.mockRestore()
	})

	it('warns when an operator id in `items` resolves to nothing', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		createTable<Row>({
			data: DATA,
			columns: [{ accessorKey: 'total', cell: 'number', filtering: { operators: { items: ['nonesuch'] } } }],
			filtering: true,
		})

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"nonesuch"'))
		warn.mockRestore()
	})
})

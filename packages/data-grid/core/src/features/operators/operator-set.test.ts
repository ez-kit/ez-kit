import { columnFilteringFeature, createFilteredRowModel, filterFns, tableFeatures } from '@tanstack/table-core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTable } from '../../create-table'

import { OperatorInput } from './operators'

import type { FilterOperatorDef, OperatorsConfig } from './operators'
import type { TableConfig } from '../../types'

const FILTERING = tableFeatures({
	columnFilteringFeature,
	filteredRowModel: createFilteredRowModel(),
	filterFns,
})

type Row = { id: string; name: string; amount: number; createdAt: string; score: number }

const DATA: Row[] = [
	{ id: '1', name: 'Ada', amount: 10, createdAt: '2026-01-01', score: 2 },
	{ id: '2', name: 'Bob', amount: 20, createdAt: '2026-06-01', score: 4 },
]

function single<T>(id: string, filterFn: (rowValue: unknown, value: T) => boolean): FilterOperatorDef<T> {
	return { id, label: id, input: OperatorInput.Single, filterFn }
}

const after = single<string>('after', (rowValue, value) => String(rowValue) > value)
const before = single<string>('before', (rowValue, value) => String(rowValue) < value)
const textEquals = single<string>('equals', (rowValue, value) => String(rowValue).toLowerCase() === value.toLowerCase())
const numberEquals = single<number>('equals', (rowValue, value) => Number(rowValue) === value)
const contains = single<string>('contains', (rowValue, value) => String(rowValue).includes(value))
const greaterThan = single<number>('greaterThan', (rowValue, value) => Number(rowValue) > value)
const atLeast = single<number>('atLeast', (rowValue, value) => Number(rowValue) >= value)
const between: FilterOperatorDef<string> = {
	id: 'between',
	label: 'Between',
	input: OperatorInput.Range,
	filterFn: () => true,
}

function grid(
	operators: OperatorsConfig | undefined,
	columns: TableConfig<typeof FILTERING, Row>['columns'],
	tableOperators?: boolean,
) {
	return createTable({
		features: FILTERING,
		...(operators !== undefined ? { operators } : {}),
		data: DATA,
		columns,
		filtering: tableOperators === undefined ? true : { operators: tableOperators },
	})
}

type Grid = ReturnType<typeof grid>

/** The ids, and the default, a column ended up with. */
function operatorsOf(table: Grid, columnId: string) {
	const filtering = table.getColumn(columnId)?.columnDef.meta?.filtering
	if (!filtering) return undefined
	return { ids: filtering.operators?.map((op) => op.id), defaultOperator: filtering.defaultOperator }
}

function visibleIds(table: Grid): string[] {
	return table.getRowModel().rows.map((r) => r.original.id)
}

describe('a column offers its cell type’s set from the grid’s `operators`', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('offers exactly the set of its type, in order', () => {
		const table = grid({ byType: { date: [after, before] } }, [
			{ accessorKey: 'createdAt', cell: 'date', filtering: { operators: true } },
		])

		expect(operatorsOf(table, 'createdAt')?.ids).toEqual(['after', 'before'])
	})

	it('compares by its own type’s definition when two types share an id', () => {
		const table = grid({ byType: { text: [textEquals], number: [numberEquals] } }, [
			{ accessorKey: 'name', filtering: { operators: true } },
			{ accessorKey: 'amount', cell: 'number', filtering: { operators: true } },
		])

		table.getColumn('name')?.setFilterValue({ operator: 'equals', value: 'ADA' })
		expect(visibleIds(table)).toEqual(['1'])

		table.getColumn('name')?.setFilterValue(undefined)
		table.getColumn('amount')?.setFilterValue({ operator: 'equals', value: 20 })
		expect(visibleIds(table)).toEqual(['2'])
	})

	it('serves a project-registered cell type', () => {
		const table = grid({ byType: { rating: [atLeast] } }, [
			{ accessorKey: 'score', cell: 'rating', filtering: { operators: true } },
		])

		expect(operatorsOf(table, 'score')?.ids).toEqual(['atLeast'])
	})

	it('opens with the set’s default for the type', () => {
		const table = grid({ byType: { date: [after, between] }, defaultByType: { date: 'between' } }, [
			{ accessorKey: 'createdAt', cell: 'date', filtering: { operators: true } },
		])

		expect(operatorsOf(table, 'createdAt')?.defaultOperator).toBe('between')
	})

	it('opens with the first operator of the set when the type names no default', () => {
		const table = grid({ byType: { number: [greaterThan, numberEquals] } }, [
			{ accessorKey: 'amount', cell: 'number', filtering: { operators: true } },
		])

		expect(operatorsOf(table, 'amount')?.defaultOperator).toBe('greaterThan')
	})

	it('narrows its type’s set by id', () => {
		const table = grid({ byType: { text: [contains, textEquals] } }, [
			{ accessorKey: 'name', filtering: { operators: { items: ['equals'] } } },
		])

		expect(operatorsOf(table, 'name')).toEqual({ ids: ['equals'], defaultOperator: 'equals' })
	})

	it('uses a definition written in the column as is', () => {
		const fuzzy = single<string>('fuzzy', (rowValue, value) => String(rowValue).startsWith(value))
		const table = grid({ byType: { text: [contains] } }, [
			{ accessorKey: 'name', filtering: { operators: { items: ['contains', fuzzy] } } },
		])

		expect(operatorsOf(table, 'name')?.ids).toEqual(['contains', 'fuzzy'])
		table.getColumn('name')?.setFilterValue({ operator: 'fuzzy', value: 'B' })
		expect(visibleIds(table)).toEqual(['2'])
	})

	it('warns about an id from another type’s set, and filters nothing by it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const table = grid({ byType: { text: [contains], date: [between] } }, [
			{ accessorKey: 'name', filtering: { operators: { items: ['between'] } } },
		])

		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/"name".*"between"/))
		table.getColumn('name')?.setFilterValue({ operator: 'between', value: 'x' })
		expect(visibleIds(table)).toEqual(['1', '2'])
	})

	it('switches nothing on by itself', () => {
		const table = grid({ byType: { text: [contains] } }, [{ accessorKey: 'name' }])

		expect(operatorsOf(table, 'name')?.ids).toBeUndefined()
	})
})

describe('operators switched on with no set', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('warns once for the grid, and leaves every column a plain filter', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const columns: TableConfig<typeof FILTERING, Row>['columns'] = [
			{ accessorKey: 'name' },
			{ accessorKey: 'amount', cell: 'number' },
			{ accessorKey: 'createdAt', cell: 'date' },
		]
		// Twice, as a React grid builds its options on every render.
		grid(undefined, columns, true)
		const table = grid(undefined, columns, true)

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('`filtering.operators: true`'))
		for (const id of ['name', 'amount', 'createdAt']) expect(operatorsOf(table, id)?.ids).toBeUndefined()
	})

	it('warns with the column and its type when the column asked for a type with no set', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		grid({ byType: { text: [contains] } }, [{ accessorKey: 'score', cell: 'rating', filtering: { operators: true } }])

		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/"score".*"rating"/))
		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('defineCellType'))
	})
})

describe('development checks on an operator set', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('warns about an id listed twice in one set', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		grid({ byType: { text: [contains, contains] } }, [{ accessorKey: 'name', filtering: { operators: true } }])

		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/"text".*"contains" twice/))
	})

	it('warns about a definition without a valid input', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const legacy = { id: 'legacyEmpty', label: 'Empty', filterFn: () => true } as unknown as FilterOperatorDef
		grid({ byType: { rating: [legacy] } }, [{ accessorKey: 'score', cell: 'rating', filtering: { operators: true } }])

		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/"legacyEmpty".*"rating".*no valid `input` \(missing\)/))
	})

	it('warns about a set default the set does not have, and opens with the first operator', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const table = grid({ byType: { number: [greaterThan] }, defaultByType: { number: 'greaterThen' } }, [
			{ accessorKey: 'amount', cell: 'number', filtering: { operators: true } },
		])

		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/"greaterThen".*"number"/))
		expect(operatorsOf(table, 'amount')?.defaultOperator).toBe('greaterThan')
	})

	it('says nothing when only a column’s own items leave the set default out', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const table = grid({ byType: { text: [contains, textEquals] }, defaultByType: { text: 'contains' } }, [
			{ accessorKey: 'name', filtering: { operators: { items: ['equals'] } } },
		])

		expect(warn).not.toHaveBeenCalled()
		expect(operatorsOf(table, 'name')?.defaultOperator).toBe('equals')
	})
})

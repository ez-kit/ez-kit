import {
	DATE_RANGE_PRESETS,
	DATE_VALUE_PRESETS,
	createColumns,
	createTable,
	defaultMessages,
	resolveMessages,
} from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { prepareDataGridTable } from '../prepare-table'
import { TEST_FEATURES } from '../test-utils'

import { FilterEditor, resolveColumnFilter } from './column-filter-model'

import type { CellTypeRegistry } from '../cell-types-context'
import type { GridFeatures } from '../types'
import type { ColumnFilterModel, ColumnFilterModelContext } from './column-filter-model'
import type { ColumnDef, GridMessages, StructuredFilterValue } from '@ez-kit/data-grid-core'
import type { Column } from '@tanstack/table-core'
import type { ReactNode } from 'react'

type Row = {
	id: number
	name: string
	age: number
	status: 'open' | 'done'
	priority: 'low' | 'high'
	joinedAt: string
	score: number
	active: boolean
	rating: number
}

const DATA: Row[] = [
	{
		id: 1,
		name: 'Ann',
		age: 30,
		status: 'open',
		priority: 'low',
		joinedAt: '2026-05-10',
		score: 10,
		active: true,
		rating: 3,
	},
	{
		id: 2,
		name: 'Bob',
		age: 40,
		status: 'open',
		priority: 'high',
		joinedAt: '2026-05-12',
		score: 20,
		active: false,
		rating: 4,
	},
	{
		id: 3,
		name: 'Cid',
		age: 50,
		status: 'open',
		priority: 'low',
		joinedAt: '2026-05-14',
		score: 30,
		active: true,
		rating: 5,
	},
	{
		id: 4,
		name: 'Dee',
		age: 60,
		status: 'done',
		priority: 'high',
		joinedAt: '2026-05-16',
		score: 40,
		active: false,
		rating: 2,
	},
]

const STATUS_ITEMS = [
	{ value: 'open', label: 'Open' },
	{ value: 'done', label: 'Done' },
]

const PRIORITY_ITEMS = [
	{ value: 'low', label: 'Low', icon: 'arrow-down' },
	{ value: 'high', label: 'High', icon: 'arrow-up' },
]

const fuzzyOperator = { id: 'fuzzy', label: 'Fuzzy', filterFn: () => true }

function RatingFilter(): ReactNode {
	return null
}

const CELL_TYPES: CellTypeRegistry = {
	rating: { filtering: RatingFilter },
	plainCustom: {},
}

const COLUMNS = createColumns<Row>([
	{ accessorKey: 'name', header: 'Name', filtering: { operators: true } },
	{
		accessorKey: 'age',
		header: 'Age',
		cell: { type: 'number' },
		filtering: { operators: { betweenOperator: { min: 0, max: 100 } }, debounce: 1000 },
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: { type: 'select', config: { items: STATUS_ITEMS } },
		filtering: { operators: true, defaultOperator: 'in' },
	},
	{
		accessorKey: 'priority',
		header: 'Priority',
		cell: { type: 'badge', config: { items: PRIORITY_ITEMS } },
		filtering: { operators: true, defaultOperator: 'equals' },
	},
	{
		accessorKey: 'joinedAt',
		header: 'Joined',
		cell: { type: 'date' },
		filtering: { operators: true, presets: [...DATE_RANGE_PRESETS, ...DATE_VALUE_PRESETS] },
	},
	{ accessorKey: 'score', header: 'Score', cell: { type: 'progress' }, filtering: { operators: true } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' }, filtering: { operators: true } },
	{
		accessorKey: 'id',
		header: 'Id',
		filtering: { operators: { items: [fuzzyOperator] }, component: () => null },
	},
] satisfies ColumnDef<Row>[])

const CUSTOM_COLUMNS = createColumns<Row>([
	{ accessorKey: 'rating', header: 'Rating', cell: { type: 'rating' } },
	{ id: 'other', accessorFn: (row: Row) => row.name, header: 'Other', cell: { type: 'plainCustom' } },
	{ accessorKey: 'name', header: 'Name' },
] as never)

function makeTable(config: Record<string, unknown> = {}, columns: unknown = COLUMNS) {
	return prepareDataGridTable(
		createTable<GridFeatures, Row>({
			features: TEST_FEATURES,
			data: DATA,
			columns,
			filtering: true,
			...config,
		} as Parameters<typeof createTable<GridFeatures, Row>>[0]),
	)
}

function context(overrides: Partial<ColumnFilterModelContext> = {}): ColumnFilterModelContext {
	return { messages: resolveMessages(), tableDebounce: 250, cellTypes: CELL_TYPES, ...overrides }
}

function modelOf(
	table: ReturnType<typeof makeTable>,
	columnId: string,
	ctx: ColumnFilterModelContext = context(),
): ColumnFilterModel {
	const column = table.getColumn(columnId) as Column<GridFeatures, object> | undefined
	if (!column) throw new Error(`no column ${columnId}`)
	return resolveColumnFilter(column, ctx)
}

describe('resolveColumnFilter — operators', () => {
	it('labels operators from the grid dictionary for the column cell type', () => {
		const messages: GridMessages = resolveMessages({
			operators: { date: { ...defaultMessages.operators.date, greaterThan: 'После' } },
		})

		const model = modelOf(makeTable(), 'joinedAt', context({ messages }))

		expect(model.operators.find((op) => op.id === 'greaterThan')?.label).toBe('После')
	})

	it('keeps the label a custom operator was written with', () => {
		const model = modelOf(makeTable(), 'id')

		expect(model.operators.find((op) => op.id === 'fuzzy')?.label).toBe('Fuzzy')
	})
})

describe('resolveColumnFilter — current operator and value', () => {
	it('falls back to the default operator when the column has no filter', () => {
		const model = modelOf(makeTable(), 'status')

		expect(model.value).toBeUndefined()
		expect(model.operator).toBe('in')
		expect(model.defaultOperator).toBe('in')
	})

	it('reads the operator and value out of a set filter', () => {
		const table = makeTable()
		table.getColumn('name')?.setFilterValue({ operator: 'contains', value: 'an' })

		const model = modelOf(table, 'name')

		expect(model.value).toEqual({ operator: 'contains', value: 'an' })
		expect(model.operator).toBe('contains')
	})

	it('describes a column without operators with its raw value', () => {
		const table = makeTable({}, CUSTOM_COLUMNS)
		table.getColumn('name')?.setFilterValue('an')

		const model = modelOf(table, 'name')

		expect(model.hasOperators).toBe(false)
		expect(model.operators).toEqual([])
		expect(model.operator).toBeUndefined()
		expect(model.value).toBe('an')
	})
})

describe('resolveColumnFilter — editor', () => {
	it.each([
		['name', FilterEditor.Text],
		['age', FilterEditor.Number],
		['score', FilterEditor.Number],
		['joinedAt', FilterEditor.Date],
		['active', FilterEditor.Boolean],
		['priority', FilterEditor.Select],
		['status', FilterEditor.MultiSelect],
	] as const)('derives %s → %s', (columnId, editor) => {
		expect(modelOf(makeTable(), columnId).editor).toBe(editor)
	})

	it('is none for an operator that takes no value', () => {
		const table = makeTable()
		table.getColumn('name')?.setFilterValue({ operator: 'isEmpty', value: undefined })

		expect(modelOf(table, 'name').editor).toBe(FilterEditor.None)
	})

	it('answers for another operator without changing the current one', () => {
		const table = makeTable()
		table.getColumn('age')?.setFilterValue({ operator: 'equals', value: 5 })

		const model = modelOf(table, 'age')

		expect(model.editorFor('between')).toBe(FilterEditor.Between)
		expect(model.editor).toBe(FilterEditor.Number)
	})

	it('is custom for a column with its own filtering.component', () => {
		expect(modelOf(makeTable(), 'id').editor).toBe(FilterEditor.Custom)
	})

	it('is custom for a project cell type that renders its own filter, text for one that does not', () => {
		const table = makeTable({}, CUSTOM_COLUMNS)

		expect(modelOf(table, 'rating').editor).toBe(FilterEditor.Custom)
		expect(modelOf(table, 'other').editor).toBe(FilterEditor.Text)
	})
})

describe('resolveColumnFilter — items', () => {
	it('takes the options of a badge cell with their icons', () => {
		expect(modelOf(makeTable(), 'priority').items).toEqual(PRIORITY_ITEMS)
	})

	it('counts each option when faceted is on', () => {
		const model = modelOf(makeTable({ filtering: { faceted: true } }), 'status')

		expect(model.items).toEqual([
			{ value: 'open', label: 'Open', count: 3 },
			{ value: 'done', label: 'Done', count: 1 },
		])
	})
})

describe('resolveColumnFilter — presets', () => {
	it('offers only range presets to between, localized', () => {
		const messages = resolveMessages({
			operators: { presets: { ...defaultMessages.operators.presets, last7: 'Последние 7 дней' } },
		})
		const table = makeTable()
		table.getColumn('joinedAt')?.setFilterValue({ operator: 'between', value: {} })

		const model = modelOf(table, 'joinedAt', context({ messages }))

		expect(model.presets.map((p) => p.id)).toEqual(DATE_RANGE_PRESETS.map((p) => p.id))
		expect(model.presets.find((p) => p.id === 'last7')?.label).toBe('Последние 7 дней')
	})

	it('offers only single-date presets to a one-date operator', () => {
		const table = makeTable()
		table.getColumn('joinedAt')?.setFilterValue({ operator: 'greaterThan', value: undefined })

		expect(modelOf(table, 'joinedAt').presets.map((p) => p.id)).toEqual(DATE_VALUE_PRESETS.map((p) => p.id))
	})

	it('is empty for a column without presets', () => {
		expect(modelOf(makeTable(), 'name').presets).toEqual([])
	})
})

describe('resolveColumnFilter — debounce and between', () => {
	it('lets the column debounce win over the table one', () => {
		expect(modelOf(makeTable(), 'age', context({ tableDebounce: 300 })).debounce).toBe(1000)
	})

	it('inherits the table debounce', () => {
		expect(modelOf(makeTable(), 'name', context({ tableDebounce: 300 })).debounce).toBe(300)
	})

	it('hands over the between config', () => {
		expect(modelOf(makeTable(), 'age').between).toEqual({ min: 0, max: 100 })
	})
})

describe('resolveColumnFilter — nextValueForOperator', () => {
	function withValue(columnId: string, value: StructuredFilterValue) {
		const table = makeTable()
		table.getColumn(columnId)?.setFilterValue(value)
		return { table, model: modelOf(table, columnId) }
	}

	it('opens between with an empty range and writes nothing', () => {
		const { table, model } = withValue('age', { operator: 'equals', value: 5 })

		expect(model.hasOperators && model.nextValueForOperator('between')).toEqual({ operator: 'between', value: {} })
		expect(table.getColumn('age')?.getFilterValue()).toEqual({ operator: 'equals', value: 5 })
	})

	it('drops the range when leaving between', () => {
		const { model } = withValue('age', { operator: 'between', value: { from: 1 } })

		expect(model.hasOperators && model.nextValueForOperator('equals')).toEqual({ operator: 'equals', value: undefined })
	})

	it('drops the value for an operator that takes none', () => {
		const { model } = withValue('name', { operator: 'contains', value: 'an' })

		expect(model.hasOperators && model.nextValueForOperator('isEmpty')).toEqual({
			operator: 'isEmpty',
			value: undefined,
		})
	})

	it('switches a value it is handed rather than the applied one', () => {
		const { model } = withValue('age', { operator: 'equals', value: 5 })
		const draft: StructuredFilterValue = { operator: 'between', value: { from: 1, to: 9 } }

		expect(model.hasOperators && model.nextValueForOperator('equals', draft)).toEqual({
			operator: 'equals',
			value: undefined,
		})
	})

	it('keeps the value across two operators that both take one', () => {
		const { model } = withValue('name', { operator: 'contains', value: 'an' })

		expect(model.hasOperators && model.nextValueForOperator('startsWith')).toEqual({
			operator: 'startsWith',
			value: 'an',
		})
	})
})

describe('resolveColumnFilter — setValue and summary', () => {
	it('writes and clears the column filter', () => {
		const table = makeTable()
		const model = modelOf(table, 'name')

		model.setValue({ operator: 'contains', value: 'x' })
		expect(table.getColumn('name')?.getFilterValue()).toEqual({ operator: 'contains', value: 'x' })

		model.setValue(undefined)
		expect(table.getColumn('name')?.getFilterValue()).toBeUndefined()
	})

	it('summarises a multi value with option labels', () => {
		const table = makeTable()
		table.getColumn('status')?.setFilterValue({ operator: 'in', value: ['open', 'done'] })

		const model = modelOf(table, 'status')

		expect(model.valueDisplay).toBe('Open, Done')
		expect(model.hasValue).toBe(true)
	})

	it('carries no React element', () => {
		const model = modelOf(makeTable(), 'status')

		for (const value of Object.values(model)) {
			expect(value !== null && typeof value === 'object' && '$$typeof' in value).toBe(false)
		}
	})
})

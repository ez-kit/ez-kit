import { createColumns, createTable } from '@ez-kit/data-grid-core'
import { act, render, renderHook, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { prepareDataGridTable } from '../prepare-table'
import { TEST_FEATURES, testComponents } from '../test-utils'

import { FilterPanel, useFilters } from './filter-panel'
import { TableProvider } from './table-context'
import { Toolbar } from './toolbar'

import type { DataTable, GridFeatures } from '../types'
import type { UseFiltersResult } from './filter-panel'
import type { ColumnFiltersState } from '@tanstack/table-core'
import type { ReactNode } from 'react'

type Row = { id: number; name: string; age: number; status: 'open' | 'done'; note: string }

const DATA: Row[] = [
	{ id: 1, name: 'Ann', age: 30, status: 'open', note: 'a' },
	{ id: 2, name: 'Bob', age: 40, status: 'done', note: 'b' },
]

const COLUMNS = createColumns<Row>([
	{ accessorKey: 'name', header: 'Name', filtering: { operators: true } },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' }, filtering: { operators: true } },
	{
		accessorKey: 'status',
		header: 'Status',
		cell: {
			type: 'select',
			config: {
				items: [
					{ value: 'open', label: 'Open' },
					{ value: 'done', label: 'Done' },
				],
			},
		},
		filtering: { operators: true },
	},
	{ accessorKey: 'note', header: 'Note' },
])

function makeTable(config: Record<string, unknown> = {}) {
	return prepareDataGridTable(
		createTable<GridFeatures, Row>({
			features: TEST_FEATURES,
			data: DATA,
			columns: COLUMNS,
			filtering: true,
			...config,
		}),
	)
}

function wrapperFor(table: DataTable<GridFeatures, Row>) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<GridComponentsProvider components={testComponents}>
				<TableProvider table={table}>{children}</TableProvider>
			</GridComponentsProvider>
		)
	}
}

function hookFor(table: DataTable<GridFeatures, Row>) {
	return renderHook(() => useFilters(), { wrapper: wrapperFor(table) })
}

function filtersOf(table: DataTable<GridFeatures, Row>): ColumnFiltersState {
	return table.store.state.columnFilters
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('useFilters — value', () => {
	it('collects the operator columns that hold a filter, keyed by column id', () => {
		const table = makeTable()
		table.setColumnFilters([
			{ id: 'status', value: { operator: 'in', value: ['open'] } },
			{ id: 'age', value: { operator: 'between', value: { from: 1 } } },
		])

		const { result } = hookFor(table)

		expect(result.current?.value).toEqual({
			status: { operator: 'in', value: ['open'] },
			age: { operator: 'between', value: { from: 1 } },
		})
	})

	it('leaves a column without operators out of the value but keeps it in filters', () => {
		const table = makeTable()
		table.getColumn('note')?.setFilterValue('a')

		const { result } = hookFor(table)

		expect(result.current?.value).toEqual({})
		expect(result.current?.filters.map((c) => c.id)).toContain('note')
	})
})

describe('useFilters — setValue', () => {
	it('writes every column in one state change, so onChange fires once', () => {
		const onChange = vi.fn()
		const table = makeTable({ filtering: { onChange } })
		const { result } = hookFor(table)

		act(() => {
			result.current?.setValue({
				name: { operator: 'contains', value: 'an' },
				age: { operator: 'greaterThan', value: 18 },
				status: { operator: 'in', value: ['open'] },
			})
		})

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange).toHaveBeenCalledWith([
			{ id: 'name', value: { operator: 'contains', value: 'an' } },
			{ id: 'age', value: { operator: 'greaterThan', value: 18 } },
			{ id: 'status', value: { operator: 'in', value: ['open'] } },
		])
	})

	it('clears an operator column that the next value does not name', () => {
		const table = makeTable()
		table.getColumn('status')?.setFilterValue({ operator: 'in', value: ['open'] })
		const { result } = hookFor(table)

		act(() => {
			result.current?.setValue({ age: { operator: 'greaterThan', value: 18 } })
		})

		expect(filtersOf(table)).toEqual([{ id: 'age', value: { operator: 'greaterThan', value: 18 } }])
	})

	it('keeps the plain filter of a column without operators', () => {
		const table = makeTable()
		table.getColumn('note')?.setFilterValue('a')
		const { result } = hookFor(table)

		act(() => {
			result.current?.setValue({})
		})

		expect(filtersOf(table)).toEqual([{ id: 'note', value: 'a' }])
	})

	it.each([
		['an empty set', { operator: 'in', value: [] }, 'status'],
		['an empty string', { operator: 'contains', value: '' }, 'name'],
		['no value', { operator: 'contains', value: undefined }, 'name'],
		['an empty range', { operator: 'between', value: {} }, 'age'],
		['a range with neither bound', { operator: 'between', value: { from: '', to: undefined } }, 'age'],
	] as const)('does not store %s as a filter', (_, value, columnId) => {
		const onChange = vi.fn()
		const table = makeTable({ filtering: { onChange } })
		const { result } = hookFor(table)

		act(() => {
			result.current?.setValue({ [columnId]: value })
		})

		expect(filtersOf(table)).toEqual([])
		expect(onChange).toHaveBeenCalledTimes(0)
	})

	it('stores an operator that takes no value', () => {
		const table = makeTable()
		const { result } = hookFor(table)

		act(() => {
			result.current?.setValue({ name: { operator: 'isEmpty', value: undefined } })
		})

		expect(filtersOf(table)).toEqual([{ id: 'name', value: { operator: 'isEmpty', value: undefined } }])
	})

	it('ignores a key that names no operator column, and warns in development', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const table = makeTable()
		table.getColumn('note')?.setFilterValue('a')
		const { result } = hookFor(table)

		act(() => {
			result.current?.setValue({
				nope: { operator: 'equals', value: 1 },
				note: { operator: 'equals', value: 'b' },
			})
		})

		expect(filtersOf(table)).toEqual([{ id: 'note', value: 'a' }])
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"nope"'))
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"note"'))
	})

	it('writes into the draft under draft, and onChange waits for apply', () => {
		const onChange = vi.fn()
		const table = makeTable({ draft: true, filtering: { manual: true, onChange } })
		const { result } = hookFor(table)

		act(() => {
			result.current?.setValue({ name: { operator: 'contains', value: 'an' } })
		})

		expect(onChange).not.toHaveBeenCalled()
		expect(table.draft.isDirty()).toBe(true)

		act(() => {
			table.draft.apply()
		})

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange).toHaveBeenCalledWith([{ id: 'name', value: { operator: 'contains', value: 'an' } }])
	})
})

describe('useFilters — where it works', () => {
	it('works in a component inside the toolbar, outside <FilterPanel>', () => {
		const table = makeTable()
		let seen: UseFiltersResult | undefined
		function ToolbarPanel() {
			seen = useFilters()
			return null
		}

		render(<Toolbar start={<ToolbarPanel />} />, { wrapper: wrapperFor(table) })
		act(() => {
			seen?.setValue({ age: { operator: 'greaterThan', value: 18 } })
		})

		expect(seen?.filters.map((c) => c.filter.id)).toEqual(['name', 'age', 'status', 'note'])
		expect(filtersOf(table)).toEqual([{ id: 'age', value: { operator: 'greaterThan', value: 18 } }])
	})

	it('is undefined when the grid filters nothing', () => {
		const { result } = hookFor(makeTable({ filtering: false }))

		expect(result.current).toBeUndefined()
	})

	it('hands the same value and setValue to the <FilterPanel> render function', () => {
		const table = makeTable()
		table.getColumn('name')?.setFilterValue({ operator: 'contains', value: 'an' })
		let seen: UseFiltersResult | undefined

		render(
			<FilterPanel>
				{(args) => {
					seen = args
					return null
				}}
			</FilterPanel>,
			{ wrapper: wrapperFor(table) },
		)
		act(() => {
			seen?.setValue({})
		})

		expect(filtersOf(table)).toEqual([])
	})
})

const WAREHOUSE = {
	id: 'warehouse',
	header: 'Warehouse',
	cell: { type: 'select', config: { items: [{ value: 'msk', label: 'Moscow' }] } },
	filtering: { operators: true },
}

describe('useFilters — fields', () => {
	it('lists a field after the columns, with a field source', () => {
		const { result } = hookFor(makeTable({ filtering: { manual: true, fields: [WAREHOUSE] } }))

		expect(result.current?.filters.map((t) => t.id)).toEqual(['name', 'age', 'status', 'note', 'warehouse'])
		expect(result.current?.filters.at(-1)?.source).toEqual({ kind: 'field' })
		expect(result.current?.filters[0]?.source.kind).toBe('column')
	})

	it('puts a field with a filter into the value', () => {
		const table = makeTable({
			filtering: { manual: true, fields: [WAREHOUSE] },
			initialState: { columnFilters: [{ id: 'warehouse', value: { operator: 'equals', value: 'msk' } }] },
		})
		const { result } = hookFor(table)

		expect(result.current?.value).toEqual({ warehouse: { operator: 'equals', value: 'msk' } })
		expect(result.current?.filters.at(-1)?.hasValue).toBe(true)
	})

	it('writes columns and fields in one state change', () => {
		const onChange = vi.fn()
		const table = makeTable({ filtering: { manual: true, onChange, fields: [WAREHOUSE] } })
		const { result } = hookFor(table)

		act(() => {
			result.current?.setValue({
				status: { operator: 'in', value: ['open'] },
				warehouse: { operator: 'in', value: ['msk'] },
			})
		})

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange).toHaveBeenCalledWith([
			{ id: 'status', value: { operator: 'in', value: ['open'] } },
			{ id: 'warehouse', value: { operator: 'in', value: ['msk'] } },
		])
	})

	it('treats the key of a field that is not offered without `manual` as unknown', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const table = makeTable({ filtering: { fields: [WAREHOUSE] } })
		const { result } = hookFor(table)

		expect(result.current?.filters.map((t) => t.id)).not.toContain('warehouse')
		act(() => {
			result.current?.setValue({ warehouse: { operator: 'in', value: ['msk'] } })
		})

		expect(filtersOf(table)).toEqual([])
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"warehouse"'))
	})

	it('returns a grid whose only target is a field', () => {
		const table = prepareDataGridTable(
			createTable<GridFeatures, Row>({
				features: TEST_FEATURES,
				data: DATA,
				columns: createColumns<Row>([{ accessorKey: 'name', header: 'Name', filtering: false }]),
				filtering: { manual: true, fields: [WAREHOUSE] },
			}),
		)
		const { result } = hookFor(table)
		const { container } = render(<FilterPanel />, { wrapper: wrapperFor(table) })

		expect(result.current?.filters.map((t) => t.id)).toEqual(['warehouse'])
		expect(container.textContent).toContain('Warehouse')
	})

	it('holds a field in the draft until apply', () => {
		const onChange = vi.fn()
		const table = makeTable({ draft: true, filtering: { manual: true, onChange, fields: [WAREHOUSE] } })
		const { result } = hookFor(table)

		act(() => {
			result.current?.filters.at(-1)?.filter.setValue({ operator: 'in', value: ['msk'] })
		})

		expect(onChange).not.toHaveBeenCalled()
		expect(table.draft.isDirty()).toBe(true)

		act(() => {
			table.draft.apply()
		})

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange).toHaveBeenCalledWith([{ id: 'warehouse', value: { operator: 'in', value: ['msk'] } }])
	})
})

describe('<FilterPanel> — driving a field control', () => {
	it('re-renders the field chip as the user picks a value, and reports it', async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		const table = makeTable({ filtering: { manual: true, onChange, fields: [WAREHOUSE] } })
		const { container } = render(<FilterPanel />, { wrapper: wrapperFor(table) })
		const chip = () =>
			[...container.querySelectorAll('[data-slot="filter-panel-chip"]')].find((c) =>
				c.textContent.includes('Warehouse'),
			)

		await user.click(within(chip() as HTMLElement).getByRole('button', { name: /Warehouse/ }))
		await user.click(within(chip() as HTMLElement).getByRole('checkbox', { name: 'Moscow' }))

		expect(chip()?.querySelector('[data-slot="filter-panel-chip-value"]')?.textContent).toBe('Moscow')
		expect(onChange).toHaveBeenLastCalledWith([{ id: 'warehouse', value: { operator: 'in', value: ['msk'] } }])
	})
})

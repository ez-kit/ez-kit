import { createColumns } from '@ez-kit/data-grid-core'
import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { baseCellTypes } from '../cell-types'
import { renderGrid } from '../test-utils'

import { DataGrid } from './data-grid'
import { resolveFilter } from './filter-model'
import { collectFilterTargets } from './filter-target'

import type { TestRow } from '../test-utils'
import type { GridFeatures } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'
import type { FieldState } from '@ez-kit/data-grid-core'

function TextInput({ id, value, onChange }: FieldState) {
	return (
		<input
			id={id}
			value={String(value ?? '')}
			onChange={(e) => {
				onChange(e.target.value)
			}}
		/>
	)
}

function NumberInput({ id, value, onChange }: FieldState) {
	return (
		<input
			id={id}
			type='number'
			value={typeof value === 'number' ? value : ''}
			onChange={(e) => {
				onChange(Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber)
			}}
		/>
	)
}

const cellTypes = {
	...baseCellTypes,
	text: { ...baseCellTypes.text, filtering: TextInput },
	number: { ...baseCellTypes.number, filtering: NumberInput },
}

function setup(debounce = 300, operators = false, extra: Partial<UseDataGridConfig<GridFeatures, TestRow>> = {}) {
	return renderGrid({
		columns: createColumns<TestRow>([
			{ accessorKey: 'name', header: 'Name', cell: { type: 'text' }, filtering: { operators } },
			{ accessorKey: 'age', header: 'Age', cell: { type: 'number' }, filtering: { operators, debounce: 800 } },
		]),
		cellTypes,
		filtering: { manual: true, debounce },
		globalFiltering: { debounce: 0 },
		...extra,
	})
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('standard scalar filter commit timing', () => {
	it('debounces registered text, updates the display immediately, and restarts only on edits', () => {
		const { table } = setup()
		const input = screen.getByRole('textbox', { name: /filter name/i })
		fireEvent.change(input, { target: { value: 'A' } })
		act(() => {
			vi.advanceTimersByTime(200)
		})
		fireEvent.change(input, { target: { value: 'Ann' } })
		expect(input).toHaveValue('Ann')
		expect(table.store.state.columnFilters).toEqual([])
		act(() => {
			vi.advanceTimersByTime(299)
		})
		expect(table.store.state.columnFilters).toEqual([])
		act(() => {
			vi.advanceTimersByTime(1)
		})
		expect(table.getColumn('name')?.getFilterValue()).toBe('Ann')
	})

	it.each([false, true])('uses the number override and preserves numeric values (operators: %s)', (operators) => {
		const { table } = setup(300, operators)
		const input = screen.getByRole('spinbutton', { name: /filter age/i })
		fireEvent.change(input, { target: { value: '12' } })
		expect(input).toHaveValue(12)
		expect(table.getColumn('age')?.getFilterValue()).toBeUndefined()
		act(() => {
			vi.advanceTimersByTime(799)
		})
		expect(table.getColumn('age')?.getFilterValue()).toBeUndefined()
		act(() => {
			vi.advanceTimersByTime(1)
		})
		expect(table.getColumn('age')?.getFilterValue()).toEqual(operators ? { operator: 'equals', value: 12 } : 12)
	})

	it('keeps keyboard deletion on the timer and replaces it without an intermediate clear', () => {
		const { table } = setup()
		act(() => table.getColumn('age')?.setFilterValue(100))
		const input = screen.getByRole('spinbutton', { name: /filter age/i })
		fireEvent.change(input, { target: { value: '' } })
		expect(table.getColumn('age')?.getFilterValue()).toBe(100)
		fireEvent.change(input, { target: { value: '200' } })
		act(() => {
			vi.advanceTimersByTime(800)
		})
		expect(table.getColumn('age')?.getFilterValue()).toBe(200)
	})

	it('commits text and global search immediately with zero debounce', () => {
		const { table } = setup(0)
		fireEvent.change(screen.getByRole('textbox', { name: /filter name/i }), { target: { value: 'Ann' } })
		fireEvent.change(screen.getByRole('textbox', { name: /search/i }), { target: { value: 'Bob' } })
		expect(table.getColumn('name')?.getFilterValue()).toBe('Ann')
		expect(table.store.state.globalFilter).toBe('Bob')
	})
})

describe('filter commands supersede pending edits', () => {
	it('model clear is synchronous and evaluates a column updater only once', () => {
		const { table } = setup()
		fireEvent.change(screen.getByRole('textbox', { name: /filter name/i }), { target: { value: 'Ann' } })
		const target = collectFilterTargets(table).find((entry) => entry.id === 'name')
		if (!target) throw new Error('Missing name filter target')
		const model = resolveFilter(target, { messages: table.grid.messages, tableDebounce: 800, cellTypes })
		act(() => {
			model.setValue(undefined)
		})
		expect(screen.getByRole('textbox', { name: /filter name/i })).toHaveValue('')
		const update = vi.fn(() => 'Bob')
		act(() => table.getColumn('name')?.setFilterValue(update))
		expect(update).toHaveBeenCalledTimes(1)
		expect(table.getColumn('name')?.getFilterValue()).toBe('Bob')
		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(table.getColumn('name')?.getFilterValue()).toBe('Bob')
	})

	it('batch writes columns and fields synchronously, removes omitted operator targets, and preserves plain filters', () => {
		const onChange = vi.fn()
		const { table } = renderGrid(
			{
				columns: createColumns<TestRow>([
					{ accessorKey: 'name', header: 'Name', filtering: { operators: true } },
					{ accessorKey: 'age', header: 'Age' },
				]),
				filtering: {
					manual: true,
					debounce: 800,
					onChange,
					fields: [{ id: 'region', header: 'Region', filtering: { operators: true } }],
				},
			},
			<DataGrid.FilterPanel>
				{({ setValue }) => (
					<button
						onClick={() => {
							setValue({ name: { operator: 'contains', value: 'Ann' }, region: { operator: 'equals', value: 'North' } })
						}}
					>
						batch
					</button>
				)}
			</DataGrid.FilterPanel>,
		)
		act(() => {
			table.setColumnFilters([{ id: 'age', value: 12 }])
		})
		onChange.mockClear()
		fireEvent.click(screen.getByRole('button', { name: 'batch' }))
		expect(onChange).toHaveBeenCalledTimes(1)
		expect(table.store.state.columnFilters).toEqual(
			expect.arrayContaining([
				{ id: 'age', value: 12 },
				{ id: 'name', value: { operator: 'contains', value: 'Ann' } },
				{ id: 'region', value: { operator: 'equals', value: 'North' } },
			]),
		)
	})
	it.each(['column', 'array', 'resetColumnFilters', 'reset'] as const)(
		'cancels an already-empty target through %s',
		(command) => {
			const { table } = setup()
			const input = screen.getByRole('textbox', { name: /filter name/i })
			fireEvent.change(input, { target: { value: 'Ann' } })
			act(() => {
				if (command === 'column') table.getColumn('name')?.setFilterValue(undefined)
				else if (command === 'array') table.setColumnFilters([])
				else if (command === 'resetColumnFilters') table.resetColumnFilters()
				else table.reset()
			})
			expect(input).toHaveValue('')
			act(() => {
				vi.advanceTimersByTime(1000)
			})
			expect(table.store.state.columnFilters).toEqual([])
		},
	)

	it.each(['set', 'reset', 'table'] as const)('cancels an already-empty search through %s', (command) => {
		const { table } = setup(300, false, { globalFiltering: { debounce: 800 } })
		const input = screen.getByRole('textbox', { name: /search/i })
		fireEvent.change(input, { target: { value: 'Ann' } })
		act(() => {
			if (command === 'set') table.setGlobalFilter(undefined)
			else if (command === 'reset') table.resetGlobalFilter()
			else table.reset()
		})
		expect(input).toHaveValue('')
		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(table.store.state.globalFilter).toBeUndefined()
	})

	it('does not cancel another target when a column is explicitly cleared', () => {
		const { table } = setup()
		fireEvent.change(screen.getByRole('textbox', { name: /filter name/i }), { target: { value: 'Ann' } })
		fireEvent.change(screen.getByRole('spinbutton', { name: /filter age/i }), { target: { value: '12' } })
		act(() => table.getColumn('name')?.setFilterValue(undefined))
		act(() => {
			vi.advanceTimersByTime(800)
		})
		expect(table.getColumn('name')?.getFilterValue()).toBeUndefined()
		expect(table.getColumn('age')?.getFilterValue()).toBe(12)
	})

	it.each(['startsWith', 'isEmpty'])('does not move pending text into operator %s', (operator) => {
		const { table } = setup(300, true)
		fireEvent.change(screen.getByRole('textbox', { name: /filter name/i }), { target: { value: 'Ann' } })
		act(() => table.getColumn('name')?.setFilterValue({ operator, value: undefined }))
		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(table.getColumn('name')?.getFilterValue()).toEqual({ operator, value: undefined })
	})
})

describe('draft scalar input commits', () => {
	it.each(['button', 'programmatic'])('applies current text, number, search and sorting through %s', (method) => {
		const onStateChange = vi.fn()
		const { table } = setup(800, false, { draft: true, globalFiltering: { debounce: 800 }, onStateChange })
		act(() => {
			table.setSorting([{ id: 'age', desc: true }])
		})
		fireEvent.change(screen.getByRole('textbox', { name: /filter name/i }), { target: { value: 'Ann' } })
		fireEvent.change(screen.getByRole('spinbutton', { name: /filter age/i }), { target: { value: '12' } })
		const search = screen.getByRole('textbox', { name: /search/i })
		fireEvent.change(search, { target: { value: 'Bob' } })
		expect(table.draft.get().globalFilter).toBe('Bob')
		expect(onStateChange).not.toHaveBeenCalled()
		if (method === 'button') fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
		else
			act(() => {
				table.draft.apply()
			})
		expect(table.store.state.applied).toMatchObject({
			globalFilter: 'Bob',
			columnFilters: [
				{ id: 'name', value: 'Ann' },
				{ id: 'age', value: 12 },
			],
			sorting: [{ id: 'age', desc: true }],
		})
		expect(onStateChange).toHaveBeenCalledTimes(1)
		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(table.draft.isDirty()).toBe(false)
	})

	it.each(['name', 'age'])('Enter leaves the standard %s editor draft pending', (id) => {
		const { table } = setup(800, false, { draft: true })
		const input =
			id === 'name'
				? screen.getByRole('textbox', { name: /filter name/i })
				: screen.getByRole('spinbutton', { name: /filter age/i })
		fireEvent.change(input, { target: { value: id === 'name' ? 'Ann' : '12' } })
		fireEvent.keyDown(input, { key: 'Enter' })
		expect(table.store.state.applied.columnFilters).toEqual([])
		expect(table.draft.get().columnFilters).toEqual([{ id, value: id === 'name' ? 'Ann' : 12 }])
		expect(table.draft.isDirty()).toBe(true)
	})

	it('does not apply Enter during composition', () => {
		const { table } = setup(800, false, { draft: true })
		const input = screen.getByRole('textbox', { name: /filter name/i })
		fireEvent.change(input, { target: { value: 'Ann' } })
		fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
		expect(table.draft.isDirty()).toBe(true)
		expect(table.store.state.applied.columnFilters).toEqual([])
	})

	it.each(['draft', 'axis', 'table'])('resets current input through %s', (command) => {
		const { table } = setup(800, false, { draft: true, globalFiltering: { debounce: 800 } })
		const input = screen.getByRole('textbox', { name: /filter name/i })
		fireEvent.change(input, { target: { value: 'Ann' } })
		fireEvent.change(screen.getByRole('textbox', { name: /search/i }), { target: { value: 'Bob' } })
		act(() => {
			if (command === 'draft') table.draft.reset()
			else if (command === 'axis') table.draft.resetAxis('columnFilters')
			else table.reset()
		})
		expect(input).toHaveValue('')
		expect(table.draft.get().columnFilters).toEqual([])
		expect(table.draft.get().globalFilter).toBe(command === 'axis' ? 'Bob' : undefined)
		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(input).toHaveValue('')
	})
})

describe('non-scalar filter timing', () => {
	it.each(['select', 'boolean', 'date', 'project'] as const)('keeps %s registry writes immediate', (type) => {
		const value = type === 'boolean' ? true : 'chosen'
		function Choose({ onChange }: FieldState) {
			return (
				<button
					onClick={() => {
						onChange(value)
					}}
				>
					choose
				</button>
			)
		}
		const { table } = renderGrid({
			columns: createColumns<TestRow, Record<string, object>>([{ accessorKey: 'name', cell: { type } }]),
			cellTypes: { [type]: { filtering: Choose } },
			filtering: { manual: true, debounce: 800 },
		})
		fireEvent.click(screen.getByRole('button', { name: 'choose' }))
		expect(table.getColumn('name')?.getFilterValue()).toBe(value)
	})

	it('keeps a column custom component immediate even on a text column', () => {
		const { table } = renderGrid({
			columns: createColumns<TestRow>([
				{
					accessorKey: 'name',
					cell: { type: 'text' },
					filtering: {
						component: ({ onChange }) => (
							<button
								onClick={() => {
									onChange('chosen')
								}}
							>
								choose
							</button>
						),
					},
				},
			]),
			filtering: { manual: true, debounce: 800 },
		})
		fireEvent.click(screen.getByRole('button', { name: 'choose' }))
		expect(table.getColumn('name')?.getFilterValue()).toBe('chosen')
	})
})

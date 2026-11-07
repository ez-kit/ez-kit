import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createColumns, DataGrid, useDataGrid } from '../../data-grid'
import { NumberCellInput } from '../cell-types/NumberCell'

const data = [{ id: 1, name: 'Ann', age: 12, progress: 30 }]
const columns = createColumns<(typeof data)[number]>([
	{ accessorKey: 'name', header: 'Name', cell: { type: 'text' as const } },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' as const } },
	{ accessorKey: 'progress', header: 'Progress', cell: { type: 'progress' as const } },
])

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(draft = false) {
	const { result } = renderHook(() =>
		useDataGrid({
			data,
			columns,
			draft,
			filtering: { manual: true, debounce: 800, fields: [{ id: 'limit', header: 'Limit', cell: { type: 'number' } }] },
		}),
	)
	const table = result.current
	render(
		<DataGrid table={table}>
			<DataGrid.Table />
			<DataGrid.Filter id='limit'>{({ input }) => input}</DataGrid.Filter>
		</DataGrid>,
	)
	return table
}

describe('standard kit scalar filters', () => {
	it('does not commit the same number again when blur formats leading zeroes', () => {
		const table = setup()
		const column = table.getColumn('age')
		if (!column) throw new Error('Missing age column')
		const commit = vi.spyOn(column, 'setFilterValue')
		const number = screen.getByLabelText(/filter age/i, { selector: 'input' })
		fireEvent.change(number, { target: { value: '025' } })
		expect(number).toHaveValue('025')
		act(() => {
			vi.advanceTimersByTime(800)
		})
		expect(commit).toHaveBeenCalledTimes(1)
		fireEvent.blur(number)
		act(() => {
			vi.advanceTimersByTime(800)
		})
		expect(commit).toHaveBeenCalledTimes(1)
	})
	it('clears an unfinished sign even when the stored number is already empty', () => {
		const table = setup()
		const number = screen.getByLabelText(/filter age/i, { selector: 'input' })
		fireEvent.change(number, { target: { value: '-' } })
		expect(number).toHaveValue('-')
		act(() => table.getColumn('age')?.setFilterValue(undefined))
		expect(screen.getByLabelText(/filter age/i, { selector: 'input' })).toHaveValue('')
		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(table.store.state.columnFilters).toEqual([])
	})
	it('debounces text and number header filters without changing their displayed values', () => {
		const table = setup()
		const text = screen.getByRole('textbox', { name: /filter name/i })
		const number = screen.getByLabelText(/filter age/i, { selector: 'input' })
		fireEvent.change(screen.getByLabelText(/filter progress/i, { selector: 'input' }), { target: { value: '60' } })
		fireEvent.change(text, { target: { value: 'Bob' } })
		fireEvent.change(number, { target: { value: '25' } })
		expect(text).toHaveValue('Bob')
		expect(table.store.state.columnFilters).toEqual([])
		act(() => {
			vi.advanceTimersByTime(800)
		})
		expect(table.getColumn('name')?.getFilterValue()).toBe('Bob')
		expect(table.getColumn('age')?.getFilterValue()).toBe(25)
		expect(table.getColumn('progress')?.getFilterValue()).toBe(60)
	})
	it('cancels same-value clears without canceling another pending input', () => {
		const table = setup()
		const text = screen.getByRole('textbox', { name: /filter name/i })
		fireEvent.change(text, { target: { value: 'Bob' } })
		fireEvent.change(screen.getByLabelText(/filter limit/i, { selector: 'input' }), { target: { value: '50' } })
		act(() => table.getColumn('name')?.setFilterValue(undefined))
		expect(text).toHaveValue('')
		act(() => {
			vi.advanceTimersByTime(800)
		})
		expect(table.store.state.columnFilters).toEqual([{ id: 'limit', value: 50 }])
	})
	it('keeps typed text in the draft on Enter', () => {
		const table = setup(true)
		const text = screen.getByRole('textbox', { name: /filter name/i })
		fireEvent.change(text, { target: { value: 'Bob' } })
		fireEvent.keyDown(text, { key: 'Enter' })
		expect(table.store.state.applied.columnFilters).toEqual([])
		expect(table.draft.get().columnFilters).toEqual([{ id: 'name', value: 'Bob' }])
	})
	it('applies the latest typed number explicitly and restores applied text on reset', () => {
		const table = setup(true)
		const number = screen.getByLabelText(/filter age/i, { selector: 'input' })
		fireEvent.change(number, { target: { value: '25' } })
		act(() => {
			table.draft.apply()
		})
		expect(table.store.state.applied.columnFilters).toEqual([{ id: 'age', value: 25 }])
		const text = screen.getByRole('textbox', { name: /filter name/i })
		fireEvent.change(text, { target: { value: 'Bob' } })
		act(() => {
			table.draft.reset()
		})
		expect(text).toHaveValue('')
		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(table.draft.isDirty()).toBe(false)
	})
	it('keeps unfinished signs and leading zeroes while forwarding native parsed values', () => {
		const table = setup()
		const number = screen.getByLabelText(/filter age/i, { selector: 'input' })
		fireEvent.change(number, { target: { value: '-' } })
		expect(number).toHaveValue('-')
		expect(table.store.state.columnFilters).toEqual([])
		fireEvent.change(number, { target: { value: '-01' } })
		expect(number).toHaveValue('-01')
		act(() => {
			vi.advanceTimersByTime(800)
		})
		expect(table.getColumn('age')?.getFilterValue()).toBe(-1)
		act(() => {
			table.resetColumnFilters()
		})
		expect(screen.getByLabelText(/filter age/i, { selector: 'input' })).toHaveValue('')
	})
	it('retains the existing numeric editing behavior without a filter delay', () => {
		const onChange = vi.fn()
		render(
			<NumberCellInput
				id='edit-number'
				value={undefined}
				onChange={onChange}
				onBlur={() => {}}
				label='Editing'
				errors={[]}
				error={undefined}
				isValidating={false}
			/>,
		)
		const input = screen.getByLabelText('Editing', { selector: 'input' })
		fireEvent.change(input, { target: { value: '25' } })

		expect(onChange).not.toHaveBeenCalled()
		fireEvent.blur(input)
		expect(onChange).toHaveBeenCalledWith(25)
	})
})

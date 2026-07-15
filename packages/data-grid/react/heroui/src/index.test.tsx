import { createDataGridInstance, createTable, defineColumns } from '@ez-kit/data-grid-react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ColumnVisibilityMenu } from './blocks/column-visibility/ColumnVisibilityMenu'
import { BetweenInput } from './blocks/filtering/BetweenInput'
import { MultiSelectFilter } from './blocks/filtering/MultiSelectFilter'
import { PageSizer } from './blocks/pagination/PageSizer'

import {
	CellTypesProvider,
	cellTypes,
	createColumnHelper,
	DataGrid,
	DataGridOptionsProvider,
	defineColumns as kitDefineColumns,
	extractState,
	GridComponentsProvider,
	parseState,
	useDataGrid,
	useDataGridOptions,
	useExtractedState,
	ValidationError,
} from './index'

import type { ColumnDef, ColumnHelper, DataGridProps, SortingState } from './index'

type User = {
	id: number
	name: string
}

describe('@ez-kit/data-grid-heroui', () => {
	it('exports the public DataGrid bundle', () => {
		expect(DataGrid).toBeTypeOf('function')
		expect(GridComponentsProvider).toBeTypeOf('function')
		expect(useDataGrid).toBeTypeOf('function')
		expect(CellTypesProvider).toBeTypeOf('function')
		expect(cellTypes.select).toBeDefined()
		expect(cellTypes.badge).toBeDefined()
		expect(cellTypes.image).toBeDefined()
		expect(cellTypes.link).toBeDefined()
		expect(cellTypes.progress).toBeDefined()
	})

	// The kit must carry the whole consumer surface on its own: installing a kit and also
	// depending on `@ez-kit/data-grid-react` to reach `defineColumns` is the thing #66 removes.
	it('re-exports the adapter consumer surface', () => {
		expect(kitDefineColumns).toBeTypeOf('function')
		expect(createColumnHelper).toBeTypeOf('function')
		expect(extractState).toBeTypeOf('function')
		expect(parseState).toBeTypeOf('function')
		expect(useExtractedState).toBeTypeOf('function')
		expect(DataGridOptionsProvider).toBeTypeOf('function')
		expect(useDataGridOptions).toBeTypeOf('function')
		expect(ValidationError).toBeTypeOf('function')
	})

	// Type-level half of the same guarantee: these annotations are the assertion — the test
	// fails at `pnpm typecheck` if the kit stops carrying a type an example relies on.
	it('types a consumer that imports from the kit alone', () => {
		const columns: ColumnDef<User>[] = kitDefineColumns<User>([{ accessorKey: 'name', header: 'Name' }])
		const helper: ColumnHelper<User> = createColumnHelper<User>()
		const sorting: SortingState = [{ id: 'name', desc: false }]
		const props: DataGridProps<User> = { data: [{ id: 1, name: 'Ada' }], columns }

		expect(columns).toHaveLength(1)
		expect(helper).toBeDefined()
		expect(sorting[0]?.id).toBe('name')
		expect(props.columns).toBe(columns)
	})

	it('renders a simple DataGrid', () => {
		const table = createTable<User>({
			data: [{ id: 1, name: 'Ada' }],
			columns: defineColumns<User>([{ accessorKey: 'name', header: 'Name' }]),
		})

		render(<DataGrid table={createDataGridInstance(table)} />)

		expect(screen.getByRole('grid', { name: 'Data grid' })).toBeInTheDocument()
		expect(screen.getByText('Name')).toBeInTheDocument()
		expect(screen.getByText('Ada')).toBeInTheDocument()
	})

	it('selects rows through the grid checkbox', () => {
		const table = createTable<User>({
			data: [{ id: 1, name: 'Ada' }],
			columns: defineColumns<User>([{ accessorKey: 'name', header: 'Name' }]),
			selection: true,
		})

		render(<DataGrid table={createDataGridInstance(table)} />)

		const checkbox = screen.getByRole('checkbox', { name: /Select row/i })
		fireEvent.click(checkbox)

		expect(table.getIsAllRowsSelected()).toBe(true)
	})

	it('passes numeric page sizes from PageSizer', () => {
		const onPageSizeChange = vi.fn()

		render(
			<PageSizer
				pageSize={10}
				items={[10, 25]}
				onPageSizeChange={onPageSizeChange}
			/>,
		)

		fireEvent.click(screen.getByRole('button'))
		fireEvent.click(screen.getByRole('option', { name: '25' }))

		expect(onPageSizeChange).toHaveBeenCalledWith(25)
	})

	it('renders BetweenInput as slider with two thumbs when variant="slider"', () => {
		const onChange = vi.fn()
		render(
			<BetweenInput
				value={{ from: 10, to: 90 }}
				onChange={onChange}
				variant='slider'
				type='number'
				min={0}
				max={100}
			/>,
		)

		// React Aria emits one hidden `<input role="slider">` per thumb.
		const sliders = screen.getAllByRole('slider')
		expect(sliders).toHaveLength(2)
		// Range labels mirror the current value on each side of the track.
		expect(screen.getByText('10')).toBeInTheDocument()
		expect(screen.getByText('90')).toBeInTheDocument()
	})

	it('MultiSelectFilter renders trigger label based on selectedValues', () => {
		const onChange = vi.fn()
		const { rerender } = render(
			<MultiSelectFilter
				options={[
					{ value: 'a', label: 'Apple' },
					{ value: 'b', label: 'Banana' },
				]}
				selectedValues={[]}
				onChange={onChange}
				placeholder='Pick fruit'
			/>,
		)
		const getValueSlot = (): HTMLElement => {
			const el = document.querySelector('[data-slot="select-value"]')
			if (!el) throw new Error('expected select-value slot')
			return el as HTMLElement
		}
		expect(getValueSlot().textContent).toContain('Pick fruit')

		rerender(
			<MultiSelectFilter
				options={[
					{ value: 'a', label: 'Apple' },
					{ value: 'b', label: 'Banana' },
				]}
				selectedValues={['a']}
				onChange={onChange}
				placeholder='Pick fruit'
			/>,
		)
		expect(getValueSlot().textContent).toBe('Apple')

		rerender(
			<MultiSelectFilter
				options={[
					{ value: 'a', label: 'Apple' },
					{ value: 'b', label: 'Banana' },
				]}
				selectedValues={['a', 'b']}
				onChange={onChange}
				placeholder='Pick fruit'
			/>,
		)
		expect(getValueSlot().textContent).toBe('2 selected')
	})

	it('renders BetweenInput as numeric inputs when variant="inputs"', () => {
		const onChange = vi.fn()
		render(
			<BetweenInput
				value={{ from: 5, to: 25 }}
				onChange={onChange}
				variant='inputs'
				type='number'
			/>,
		)

		expect(screen.queryByRole('slider')).not.toBeInTheDocument()
		expect(screen.getByPlaceholderText('From')).toHaveValue(5)
		expect(screen.getByPlaceholderText('To')).toHaveValue(25)
	})

	it('BetweenInput renders preset chips when presets[] is provided for a date column', () => {
		const onChange = vi.fn()
		const onPresetSelect = vi.fn()
		const presets = [
			{ id: 'today', label: 'Today', getRange: () => ({ from: '2026-05-14', to: '2026-05-14' }) },
			{ id: 'last7', label: 'Last 7 days', getRange: () => ({ from: '2026-05-08', to: '2026-05-14' }) },
		]
		render(
			<BetweenInput
				value={{}}
				onChange={onChange}
				variant='inputs'
				type='date'
				presets={presets}
				onPresetSelect={onPresetSelect}
			/>,
		)

		const todayBtn = screen.getByRole('button', { name: 'Today' })
		expect(todayBtn).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeInTheDocument()

		fireEvent.click(todayBtn)
		expect(onPresetSelect).toHaveBeenCalledWith(presets[0])
	})

	it('BetweenInput renders RangeCalendar trigger when variant="calendar" and type="date"', () => {
		const onChange = vi.fn()
		render(
			<BetweenInput
				value={{ from: '2026-05-10', to: '2026-05-12' }}
				onChange={onChange}
				variant='calendar'
				type='date'
			/>,
		)
		// Trigger button shows the range label.
		expect(screen.getByText('2026-05-10 – 2026-05-12')).toBeInTheDocument()
	})

	it('toggles column visibility items', () => {
		const onToggle = vi.fn()

		render(<ColumnVisibilityMenu columns={[{ id: 'name', label: 'Name', isVisible: true, onToggle }]} />)

		const [columnsButton] = screen.getAllByRole('button', { name: /columns/i })
		if (!columnsButton) throw new Error('expected columns button')
		fireEvent.click(columnsButton)
		fireEvent.click(screen.getByRole('option', { name: 'Name' }))

		expect(onToggle).toHaveBeenCalledTimes(1)
	})
})

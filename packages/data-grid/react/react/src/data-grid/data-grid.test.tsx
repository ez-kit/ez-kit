import { createTable, defineColumns } from '@ez-kit/data-grid-core'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { renderWithComponents } from '../test-utils'
import { PAGE_SIZER_KEY, SELECTION_BAR_KEY } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { ResizerProps } from '../types'

type User = {
	id: number
	name: string
	age: number
}

const USERS: User[] = [
	{ id: 1, name: 'Alice', age: 30 },
	{ id: 2, name: 'Bob', age: 25 },
]
const COLUMNS = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age' },
])

function makeTable(config?: Partial<Parameters<typeof createTable<User>>[0]>) {
	return createTable<User>({ data: USERS, columns: COLUMNS, ...config })
}

describe('<DataGrid>', () => {
	it('renders table with rows', () => {
		const table = makeTable()
		renderWithComponents(<DataGrid table={table} />)
		expect(screen.getAllByRole('row')).toHaveLength(USERS.length + 1) // 1 header row + data rows
	})

	it('renders column headers', () => {
		const table = makeTable()
		renderWithComponents(<DataGrid table={table} />)
		expect(screen.getByText('Name')).toBeInTheDocument()
		expect(screen.getByText('Age')).toBeInTheDocument()
	})

	it('renders cell values', () => {
		const table = makeTable()
		renderWithComponents(<DataGrid table={table} />)
		expect(screen.getByText('Alice')).toBeInTheDocument()
		expect(screen.getByText('Bob')).toBeInTheDocument()
	})

	it('renders selection checkboxes when selection is enabled', () => {
		const table = makeTable({ selection: true })
		renderWithComponents(<DataGrid table={table} />)
		// 1 header checkbox + 1 per data row
		expect(screen.getAllByRole('checkbox')).toHaveLength(USERS.length + 1)
	})

	it('renders select-all checkbox in header when selection is enabled', () => {
		const table = makeTable({ selection: true })
		renderWithComponents(<DataGrid table={table} />)
		expect(screen.getByRole('checkbox', { name: 'Select all rows' })).toBeInTheDocument()
	})

	it('header checkbox is unchecked and not indeterminate when no rows are selected', () => {
		const table = makeTable({ selection: true })
		renderWithComponents(<DataGrid table={table} />)
		const el = screen.getByRole('checkbox', { name: 'Select all rows' })
		if (!(el instanceof HTMLInputElement)) throw new Error('expected HTMLInputElement')
		expect(el.checked).toBe(false)
		expect(el.indeterminate).toBe(false)
	})

	it('header checkbox is indeterminate when some rows are selected', () => {
		const table = makeTable({ selection: true })
		const { rerender } = renderWithComponents(<DataGrid table={table} />)
		act(() => {
			table.setRowSelection({ 0: true })
		})
		rerender(<DataGrid table={table} />)
		const el = screen.getByRole('checkbox', { name: 'Select all rows' })
		if (!(el instanceof HTMLInputElement)) throw new Error('expected HTMLInputElement')
		expect(el.indeterminate).toBe(true)
		expect(el.checked).toBe(false)
	})

	it('header checkbox is checked when all rows are selected', () => {
		const table = makeTable({ selection: true })
		const { rerender } = renderWithComponents(<DataGrid table={table} />)
		act(() => {
			table.toggleAllRowsSelected(true)
		})
		rerender(<DataGrid table={table} />)
		const el = screen.getByRole('checkbox', { name: 'Select all rows' })
		if (!(el instanceof HTMLInputElement)) throw new Error('expected HTMLInputElement')
		expect(el.checked).toBe(true)
		expect(el.indeterminate).toBe(false)
	})

	it('clicking header checkbox selects all rows', async () => {
		const table = makeTable({ selection: true })
		const { rerender } = renderWithComponents(<DataGrid table={table} />)
		const headerCheckbox = screen.getByRole('checkbox', { name: 'Select all rows' })
		await userEvent.click(headerCheckbox)
		rerender(<DataGrid table={table} />)
		expect(table.getIsAllRowsSelected()).toBe(true)
	})

	it('clicking header checkbox when all rows selected deselects all', async () => {
		const table = makeTable({ selection: true })
		const { rerender } = renderWithComponents(<DataGrid table={table} />)
		act(() => {
			table.toggleAllRowsSelected(true)
		})
		rerender(<DataGrid table={table} />)
		const headerCheckbox = screen.getByRole('checkbox', { name: 'Select all rows' })
		await userEvent.click(headerCheckbox)
		rerender(<DataGrid table={table} />)
		expect(table.getIsAllRowsSelected()).toBe(false)
		expect(table.getIsSomeRowsSelected()).toBe(false)
	})

	it('renders "+ Add" button when creating is enabled', () => {
		const table = makeTable({ creating: { onSave: () => Promise.resolve() } })
		renderWithComponents(<DataGrid table={table} />)
		expect(screen.getByText('+ Add')).toBeInTheDocument()
	})

	it('does not render "+ Add" button when creating.mode is "pin-row"', () => {
		const table = makeTable({ creating: { mode: 'pin-row', onSave: () => Promise.resolve() } })
		renderWithComponents(<DataGrid table={table} />)
		expect(screen.queryByText('+ Add')).toBeNull()
	})

	it('renders creating row without "+ Add" button when mode is "pin-row"', () => {
		const table = makeTable({ creating: { mode: 'pin-row', onSave: () => Promise.resolve() } })
		renderWithComponents(<DataGrid table={table} />)
		expect(screen.queryByText('+ Add')).toBeNull()
		// pin-row always renders creating row inputs
		expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0)
	})

	it('shows creating row inputs when creating.start() is called', () => {
		const table = makeTable({ creating: { mode: 'row', onSave: () => Promise.resolve() } })
		const { rerender } = renderWithComponents(<DataGrid table={table} />)
		// Before creating.start() there should be no inputs
		expect(screen.queryAllByRole('textbox')).toHaveLength(0)
		act(() => {
			table.creating.start()
		})
		rerender(<DataGrid table={table} />)
		// After creating.start(), input cells should appear for each non-system column
		expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0)
	})

	it('renders Edit button in row editing mode', () => {
		const table = makeTable({ editing: { mode: 'row', onSave: () => Promise.resolve() } })
		renderWithComponents(<DataGrid table={table} />)
		expect(screen.getAllByText('Edit')).toHaveLength(USERS.length)
	})

	it('renders Delete button when deleting is enabled', () => {
		const table = makeTable({ deleting: { onDelete: vi.fn() } })
		renderWithComponents(<DataGrid table={table} />)
		expect(screen.getAllByText('Delete')).toHaveLength(USERS.length)
	})

	it('calls onDelete when Delete is clicked', async () => {
		const onDelete = vi.fn()
		const table = makeTable({ deleting: { onDelete } })
		renderWithComponents(<DataGrid table={table} />)
		const deleteButtons = screen.getAllByText('Delete')
		if (!deleteButtons[0]) throw new Error('expected Delete button')
		await userEvent.click(deleteButtons[0])
		expect(onDelete).toHaveBeenCalledTimes(1)
	})

	it('renders compound children when provided', () => {
		const table = makeTable()
		renderWithComponents(
			<DataGrid table={table}>
				<span data-testid='custom-child'>custom</span>
			</DataGrid>,
		)
		expect(screen.getByTestId('custom-child')).toBeInTheDocument()
	})

	it('compound pattern renders sub-components correctly', () => {
		const table = makeTable({ pagination: true })
		renderWithComponents(
			<DataGrid table={table}>
				<DataGrid.Table />
				<DataGrid.Pagination />
			</DataGrid>,
		)
		expect(screen.getByRole('table')).toBeInTheDocument()
	})

	it('renders custom cell.component output', () => {
		const cols = defineColumns<User>([
			{
				accessorKey: 'name',
				header: 'Name',
				cell: { component: ({ value }) => <span data-testid='custom-cell'>{String(value)}</span> },
			},
			{ accessorKey: 'age', header: 'Age' },
		])
		const table = createTable<User>({ data: USERS, columns: cols })
		renderWithComponents(<DataGrid table={table} />)
		expect(screen.getAllByTestId('custom-cell')).toHaveLength(USERS.length)
	})

	it('renders boolean cell view supplied by the UI-kit registry', () => {
		type BoolRow = {
			id: number
			active: boolean
		}
		const boolCols = defineColumns<BoolRow>([{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } }])
		const boolData: BoolRow[] = [
			{ id: 1, active: true },
			{ id: 2, active: false },
		]
		const table = createTable<BoolRow>({ data: boolData, columns: boolCols })
		renderWithComponents(
			<DataGrid
				table={table}
				cellTypes={{
					boolean: { view: ({ value }) => <>{value ? '✓' : '✗'}</> },
				}}
			/>,
		)
		expect(screen.getByText('✓')).toBeInTheDocument()
		expect(screen.getByText('✗')).toBeInTheDocument()
	})

	it('uses registry view component for custom cell type', () => {
		const cols = defineColumns<User>([{ accessorKey: 'age', header: 'Age', cell: { type: 'money' } }])
		const table = createTable<User>({ data: USERS, columns: cols })
		renderWithComponents(
			<DataGrid
				table={table}
				cellTypes={{
					money: {
						view: ({ value }) => <span data-testid='money-cell'>€{String(value)}</span>,
					},
				}}
			/>,
		)
		expect(screen.getAllByTestId('money-cell')).toHaveLength(USERS.length)
	})

	it('does not render PageSizer when pageSizer config is not set', () => {
		const table = makeTable({ pagination: { pageSize: 5 } })
		renderWithComponents(<DataGrid table={table} />)
		expect(screen.queryByRole('combobox')).toBeNull()
	})

	it('renders PageSizer select with items when pageSizer config is set', () => {
		const table = makeTable({ pagination: { pageSize: 5 } })
		;(table as unknown as Record<symbol, unknown>)[PAGE_SIZER_KEY] = { items: [5, 10, 25] }
		renderWithComponents(<DataGrid table={table} />)
		const select = screen.getByRole('combobox')
		expect(select).toBeInTheDocument()
		expect(select).toHaveValue('5')
		expect(screen.getByRole('option', { name: '10' })).toBeInTheDocument()
		expect(screen.getByRole('option', { name: '25' })).toBeInTheDocument()
	})

	describe('column sizing / resizing', () => {
		it('does not render column-resizer when sizing is not set', () => {
			const table = makeTable()
			renderWithComponents(<DataGrid table={table} />)
			expect(document.querySelectorAll('[data-slot="column-resizer"]')).toHaveLength(0)
		})

		it('renders column-resizer handles when sizing is enabled', () => {
			const table = makeTable({ sizing: true })
			renderWithComponents(<DataGrid table={table} />)
			expect(document.querySelectorAll('[data-slot="column-resizer"]').length).toBeGreaterThan(0)
		})

		it('does not render column-resizer for column with enableResizing: false', () => {
			const cols = defineColumns<User>([
				{ accessorKey: 'name', header: 'Name', enableResizing: false },
				{ accessorKey: 'age', header: 'Age' },
			])
			const table = createTable<User>({ data: USERS, columns: cols, sizing: true })
			renderWithComponents(<DataGrid table={table} />)
			// only 'age' column should have a resizer (name has enableResizing: false)
			expect(document.querySelectorAll('[data-slot="column-resizer"]')).toHaveLength(1)
		})

		it('sets CSS variables on <table> when sizing is enabled', () => {
			const table = makeTable({ sizing: true })
			renderWithComponents(<DataGrid table={table} />)
			const tableEl = document.querySelector('table')
			const style = tableEl?.getAttribute('style') ?? ''
			expect(style).toContain('--header-name-size')
			expect(style).toContain('--col-name-size')
		})

		it('renders custom Resizer injected via GridComponentsProvider', () => {
			const CustomResizer = ({ isResizing }: ResizerProps) => (
				<div
					data-testid='custom-resizer'
					data-is-resizing={String(isResizing)}
				/>
			)
			const table = makeTable({ sizing: true })
			renderWithComponents(
				<GridComponentsProvider components={{ Resizer: CustomResizer }}>
					<DataGrid table={table} />
				</GridComponentsProvider>,
			)
			expect(screen.getAllByTestId('custom-resizer').length).toBeGreaterThan(0)
		})

		it('passes isResizing=false to Resizer when not actively dragging', () => {
			const CustomResizer = ({ isResizing }: ResizerProps) => (
				<div
					data-testid='custom-resizer'
					data-is-resizing={String(isResizing)}
				/>
			)
			const table = makeTable({ sizing: true })
			renderWithComponents(
				<GridComponentsProvider components={{ Resizer: CustomResizer }}>
					<DataGrid table={table} />
				</GridComponentsProvider>,
			)
			const resizers = screen.getAllByTestId('custom-resizer')
			expect(resizers[0]).toHaveAttribute('data-is-resizing', 'false')
		})

		it('always sets CSS size variables and grid-template-columns on <table>', () => {
			const table = makeTable()
			renderWithComponents(<DataGrid table={table} />)
			const tableEl = document.querySelector('table')
			const style = tableEl?.getAttribute('style') ?? ''
			expect(style).toContain('--header-name-size')
			expect(style).toContain('--col-name-size')
			expect(style).toContain('--grid-template-columns')
		})
	})

	describe('selection bar layout', () => {
		// Both <Toolbar> and <SelectionBar> share role="toolbar"; SelectionBar additionally
		// carries data-slot="selection-bar", so we compare DOM order between the SelectionBar
		// (by data-slot) and the *other* role="toolbar" element (the real Toolbar).
		function getBarAndToolbar(): { selectionBar: HTMLElement; toolbar: HTMLElement } {
			const selectionBar = document.querySelector('[data-slot="selection-bar"]')
			if (!(selectionBar instanceof HTMLElement)) throw new Error('expected [data-slot="selection-bar"]')
			const toolbars = Array.from(document.querySelectorAll('[role="toolbar"]'))
			const toolbar = toolbars.find((el) => el.getAttribute('data-slot') !== 'selection-bar')
			if (!(toolbar instanceof HTMLElement)) throw new Error('expected the non-selection-bar [role="toolbar"]')
			return { selectionBar, toolbar }
		}

		it('renders inline SelectionBar above the Toolbar in DOM order', () => {
			// Toolbar renders null without content — enable `creating` to give it the "+ Add" trigger.
			const table = makeTable({ selection: true, creating: { onSave: () => Promise.resolve() } })
			;(table as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY] = { variant: 'inline' }
			table.setRowSelection({ '1': true })
			renderWithComponents(<DataGrid table={table} />)

			const { selectionBar, toolbar } = getBarAndToolbar()
			expect(selectionBar.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
		})

		it('renders floating SelectionBar after Table/Pagination by default', () => {
			const table = makeTable({ selection: true, creating: { onSave: () => Promise.resolve() }, pagination: true })
			;(table as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY] = true
			table.setRowSelection({ '1': true })
			renderWithComponents(<DataGrid table={table} />)

			const { selectionBar, toolbar } = getBarAndToolbar()
			// floating: toolbar precedes selectionBar
			expect(toolbar.compareDocumentPosition(selectionBar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
		})
	})

	it('registry creating falls back to edit component when creating not provided', () => {
		const editFn = vi.fn(() => <input data-testid='registry-edit' />)
		const cols = defineColumns<User>([
			{ accessorKey: 'name', header: 'Name', cell: { type: 'custom-type' } },
			{ accessorKey: 'age', header: 'Age' },
		])
		const table = createTable<User>({
			data: USERS,
			columns: cols,
			creating: { mode: 'row', onSave: () => Promise.resolve() },
		})
		const { rerender } = renderWithComponents(
			<DataGrid
				table={table}
				cellTypes={{ 'custom-type': { edit: editFn } }}
			/>,
		)
		act(() => {
			table.creating.start()
		})
		rerender(
			<DataGrid
				table={table}
				cellTypes={{ 'custom-type': { edit: editFn } }}
			/>,
		)
		expect(screen.getAllByTestId('registry-edit').length).toBeGreaterThan(0)
	})
})

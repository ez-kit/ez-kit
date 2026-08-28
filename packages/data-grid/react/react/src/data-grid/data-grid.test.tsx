import { createTable, createColumns } from '@ez-kit/data-grid-core'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { prepareDataGridTable } from '../prepare-table'
import { renderWithComponents } from '../test-utils'

import { DataGrid } from './data-grid'

import type { ResizerProps } from '../types'
import type { DeletingConfig } from '@ez-kit/data-grid-core'

type User = {
	id: number
	name: string
	age: number
}

const USERS: User[] = [
	{ id: 1, name: 'Alice', age: 30 },
	{ id: 2, name: 'Bob', age: 25 },
]
const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age' },
])

function makeTable(config?: Partial<Parameters<typeof createTable<User>>[0]>) {
	const table = createTable<User>({ data: USERS, columns: COLUMNS, ...config })
	return prepareDataGridTable(table)
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
		const cols = createColumns<User>([
			{
				accessorKey: 'name',
				header: 'Name',
				cell: { component: ({ value }) => <span data-testid='custom-cell'>{value}</span> },
			},
			{ accessorKey: 'age', header: 'Age' },
		])
		const table = prepareDataGridTable(createTable<User>({ data: USERS, columns: cols }))
		renderWithComponents(<DataGrid table={table} />)
		expect(screen.getAllByTestId('custom-cell')).toHaveLength(USERS.length)
	})

	it('renders boolean cell view supplied by the UI-kit registry', () => {
		type BoolRow = {
			id: number
			active: boolean
		}
		const boolCols = createColumns<BoolRow>([{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } }])
		const boolData: BoolRow[] = [
			{ id: 1, active: true },
			{ id: 2, active: false },
		]
		const table = prepareDataGridTable(createTable<BoolRow>({ data: boolData, columns: boolCols }))
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
		const cols = createColumns<User, { money: Record<never, never> }>([
			{ accessorKey: 'age', header: 'Age', cell: { type: 'money' } },
		])
		const table = prepareDataGridTable(createTable<User>({ data: USERS, columns: cols }))
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

	it('does not auto-mount PageSizer when pagination.items is not set', () => {
		const table = makeTable({ pagination: { pageSize: 5 } })
		renderWithComponents(<DataGrid table={table} />)
		expect(screen.queryByRole('combobox')).toBeNull()
	})

	it('renders a hand-placed PageSizer even when the toolbar is told not to mount one', () => {
		// `toolbar` governs auto-mounting only — it must not erase the size list the
		// hand-placed control reads.
		// `makeTable` builds a bare core table, so the resolved options are set directly here:
		// sizes present, auto-mount off — exactly what `pagination: { toolbar: false }` resolves to.
		const table = makeTable({ pagination: { pageSize: 5 } })
		table.grid.pagination.items = [5, 10, 25]
		table.grid.pagination.pageSizer = false
		renderWithComponents(
			<DataGrid table={table}>
				<DataGrid.PageSizer />
			</DataGrid>,
		)
		expect(screen.getByRole('combobox')).toHaveValue('5')
	})

	it('renders PageSizer select with the pagination.items values', () => {
		const table = makeTable({ pagination: { pageSize: 5 } })
		table.grid.pagination.items = [5, 10, 25]
		table.grid.pagination.pageSizer = true
		renderWithComponents(<DataGrid table={table} />)
		const select = screen.getByRole('combobox')
		expect(select).toBeInTheDocument()
		expect(select).toHaveValue('5')
		expect(screen.getByRole('option', { name: '10' })).toBeInTheDocument()
		expect(screen.getByRole('option', { name: '25' })).toBeInTheDocument()
	})

	describe('column sizing / resizing', () => {
		it('does not render column-resizer when resizing is not set', () => {
			const table = makeTable()
			renderWithComponents(<DataGrid table={table} />)
			expect(document.querySelectorAll('[data-slot="column-resizer"]')).toHaveLength(0)
		})

		it('renders column-resizer handles when resizing is enabled', () => {
			const table = makeTable({ resizing: true })
			renderWithComponents(<DataGrid table={table} />)
			expect(document.querySelectorAll('[data-slot="column-resizer"]').length).toBeGreaterThan(0)
		})

		it('does not render column-resizer for column with resizing: false', () => {
			const cols = createColumns<User>([
				{ accessorKey: 'name', header: 'Name', resizing: false },
				{ accessorKey: 'age', header: 'Age' },
			])
			const table = prepareDataGridTable(createTable<User>({ data: USERS, columns: cols, resizing: true }))
			renderWithComponents(<DataGrid table={table} />)
			// only 'age' column should have a resizer (name has resizing: false)
			expect(document.querySelectorAll('[data-slot="column-resizer"]')).toHaveLength(1)
		})

		it('sets CSS variables on <table> when resizing is enabled', () => {
			const table = makeTable({ resizing: true })
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
			const table = makeTable({ resizing: true })
			renderWithComponents(
				<GridComponentsProvider components={{ resizing: { Resizer: CustomResizer } }}>
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
			const table = makeTable({ resizing: true })
			renderWithComponents(
				<GridComponentsProvider components={{ resizing: { Resizer: CustomResizer } }}>
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
			table.grid.selection.bar = { variant: 'inline' }
			table.setRowSelection({ '1': true })
			renderWithComponents(<DataGrid table={table} />)

			const { selectionBar, toolbar } = getBarAndToolbar()
			expect(selectionBar.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
		})

		it('renders floating SelectionBar after Table/Pagination by default', () => {
			const table = makeTable({
				selection: true,
				creating: { onSave: () => Promise.resolve() },
				pagination: true,
			})
			table.grid.selection.bar = true
			table.setRowSelection({ '1': true })
			renderWithComponents(<DataGrid table={table} />)

			const { selectionBar, toolbar } = getBarAndToolbar()
			// floating: toolbar precedes selectionBar
			expect(toolbar.compareDocumentPosition(selectionBar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
		})
	})

	it('registry creating falls back to edit component when creating not provided', () => {
		const editFn = vi.fn(() => <input data-testid='registry-edit' />)
		const cols = createColumns<User, { 'custom-type': Record<never, never> }>([
			{ accessorKey: 'name', header: 'Name', cell: { type: 'custom-type' } },
			{ accessorKey: 'age', header: 'Age' },
		])
		const table = prepareDataGridTable(
			createTable<User>({
				data: USERS,
				columns: cols,
				creating: { mode: 'row', onSave: () => Promise.resolve() },
			}),
		)
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

describe('<DataGrid> bulk delete confirmation', () => {
	function makeBulkTable(bulk: NonNullable<DeletingConfig<User>['bulk']>, onDelete = vi.fn()) {
		const table = makeTable({ selection: true, deleting: { onDelete: () => {}, bulk } })
		table.grid.selection.bar = true
		return { table, onDelete }
	}

	function getDialog(): HTMLElement {
		const dialog = document.querySelector('dialog')
		if (!(dialog instanceof HTMLElement)) throw new Error('expected an open ConfirmDialog <dialog>')
		return dialog
	}

	// Scoped to the selection bar: `deleting` also injects the per-row actions column, whose
	// every row carries its own Delete button.
	function bulkDeleteButton(): HTMLElement {
		return within(screen.getByRole('toolbar')).getByRole('button', { name: /delete/i })
	}

	it('runs the bulk handler instantly when confirmation is not set (no dialog)', async () => {
		const user = userEvent.setup()
		const onDelete = vi.fn()
		const { table } = makeBulkTable({ onDelete })
		table.setRowSelection({ '1': true })
		renderWithComponents(<DataGrid table={table} />)

		await user.click(bulkDeleteButton())
		expect(onDelete).toHaveBeenCalledOnce()
		expect(document.querySelector('dialog')).toBeNull()
	})

	it('falls back to the per-row handler, once per selected row, when bulk names none', async () => {
		const user = userEvent.setup()
		const onDelete = vi.fn()
		const table = makeTable({ selection: true, deleting: { onDelete, bulk: true } })
		table.grid.selection.bar = true
		table.setRowSelection({ '1': true, '2': true })
		renderWithComponents(<DataGrid table={table} />)

		await user.click(bulkDeleteButton())
		expect(onDelete).toHaveBeenCalledTimes(2)
	})

	it('opens the ConfirmDialog and defers the delete when confirmation is set', async () => {
		const user = userEvent.setup()
		const onDelete = vi.fn()
		const { table } = makeBulkTable({ onDelete, confirmation: true })
		table.setRowSelection({ '1': true, '2': true })
		renderWithComponents(<DataGrid table={table} />)

		await user.click(bulkDeleteButton())
		expect(onDelete).not.toHaveBeenCalled()
		expect(table.getState().pendingBulkDelete).toBe(true)
		// Count-aware default description for the two selected rows.
		expect(screen.getByText(/delete 2 rows/i)).toBeInTheDocument()
	})

	it('runs the handler with the selected rows and clears the pending flag on confirm', async () => {
		const user = userEvent.setup()
		const onDelete = vi.fn()
		const { table } = makeBulkTable({ onDelete, confirmation: true })
		table.setRowSelection({ '1': true })
		renderWithComponents(<DataGrid table={table} />)

		await user.click(bulkDeleteButton())
		await user.click(within(getDialog()).getByRole('button', { name: /confirm/i }))

		expect(onDelete).toHaveBeenCalledOnce()
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const args = onDelete.mock.calls.at(0)?.at(0)
		expect((args as { rows: unknown[] }).rows).toHaveLength(1)
		expect((args as { rowIds: string[] }).rowIds).toEqual(['1'])
		expect(table.getState().pendingBulkDelete).toBe(false)
		expect(document.querySelector('dialog')).toBeNull()
	})

	it('leaves data intact and clears pending on cancel', async () => {
		const user = userEvent.setup()
		const onDelete = vi.fn()
		const { table } = makeBulkTable({ onDelete, confirmation: true })
		table.setRowSelection({ '1': true })
		renderWithComponents(<DataGrid table={table} />)

		await user.click(bulkDeleteButton())
		await user.click(within(getDialog()).getByRole('button', { name: /cancel/i }))

		expect(onDelete).not.toHaveBeenCalled()
		expect(table.getState().pendingBulkDelete).toBe(false)
		expect(document.querySelector('dialog')).toBeNull()
	})

	it('uses a custom confirmation title when provided', async () => {
		const user = userEvent.setup()
		const { table } = makeBulkTable({ onDelete: vi.fn(), confirmation: { title: 'Remove these?' } })
		table.setRowSelection({ '1': true })
		renderWithComponents(<DataGrid table={table} />)

		await user.click(bulkDeleteButton())
		expect(screen.getByText('Remove these?')).toBeInTheDocument()
	})

	it('hands the whole selection to a description function', async () => {
		const user = userEvent.setup()
		const { table } = makeBulkTable({
			onDelete: vi.fn(),
			confirmation: { description: (rows) => `Removing ${String(rows.length)} of them` },
		})
		table.setRowSelection({ '1': true, '2': true })
		renderWithComponents(<DataGrid table={table} />)

		await user.click(bulkDeleteButton())
		expect(screen.getByText('Removing 2 of them')).toBeInTheDocument()
	})
})

describe('<DataGrid> uncontrolled (no useDataGrid)', () => {
	it('renders rows from data/columns props directly', () => {
		renderWithComponents(
			<DataGrid
				data={USERS}
				columns={COLUMNS}
			/>,
		)
		expect(screen.getAllByRole('row')).toHaveLength(USERS.length + 1) // header + data rows
	})

	it('renders cell values without an explicit table', () => {
		renderWithComponents(
			<DataGrid
				data={USERS}
				columns={COLUMNS}
			/>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
		expect(screen.getByText('Bob')).toBeInTheDocument()
	})

	it('honors feature config passed inline (selection)', () => {
		renderWithComponents(
			<DataGrid
				data={USERS}
				columns={COLUMNS}
				selection
			/>,
		)
		// 1 header checkbox + 1 per data row
		expect(screen.getAllByRole('checkbox')).toHaveLength(USERS.length + 1)
	})

	it('supports the compound API without a table prop', () => {
		renderWithComponents(
			<DataGrid
				data={USERS}
				columns={COLUMNS}
			>
				<DataGrid.Table />
			</DataGrid>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
		expect(screen.getByText('Bob')).toBeInTheDocument()
	})

	it('warns when a mounted grid switches between controlled and uncontrolled', () => {
		const warn = vi.spyOn(console, 'error').mockImplementation(() => {})
		try {
			const table = makeTable()
			const { rerender } = renderWithComponents(<DataGrid table={table} />)
			expect(warn).not.toHaveBeenCalled()
			rerender(
				<DataGrid
					data={USERS}
					columns={COLUMNS}
				/>,
			)
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('switched from'))
		} finally {
			warn.mockRestore()
		}
	})
})

describe('<DataGrid> unprepared table', () => {
	it('names the problem instead of crashing on a missing resolved-options object', () => {
		// `prepareDataGridTable` is what seeds `table.grid`; skipping it used to be impossible
		// because the prop demanded a wrapper type only `useDataGrid` could build.
		const raw = createTable<User>({ data: USERS, columns: COLUMNS })
		const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		expect(() => renderWithComponents(<DataGrid table={raw} />)).toThrow(/has not been prepared/)

		spy.mockRestore()
	})
})

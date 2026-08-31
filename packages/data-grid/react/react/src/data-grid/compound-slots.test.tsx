import { createColumns, createTable } from '@ez-kit/data-grid-core'
import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { prepareDataGridTable } from '../prepare-table'
import { renderWithComponents } from '../test-utils'

import { DataGrid } from './data-grid'

type User = { id: number; name: string; amount: number }

const USERS: User[] = [
	{ id: 1, name: 'Alice', amount: 10 },
	{ id: 2, name: 'Bob', amount: 32 },
]

const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name', footer: 'Total' },
	{ accessorKey: 'amount', header: 'Amount', footer: () => '42' },
])

function makeInstance() {
	return prepareDataGridTable(createTable<User>({ data: USERS, columns: COLUMNS }))
}

/**
 * The default layout mounts the footer on its own once a column declares one — see
 * `footer-default-layout.test.tsx`, which drives that through `useDataGrid`. These tests cover
 * the hand-composed path, where `<DataGrid.Table>` children replace the built-in pair and
 * nothing is mounted for you.
 */
describe('<DataGrid.Footer>', () => {
	it('is not mounted for you inside a custom <DataGrid.Table> body', () => {
		const { container } = renderWithComponents(
			<DataGrid table={makeInstance()}>
				<DataGrid.Table>
					<DataGrid.Header />
					<DataGrid.Body />
				</DataGrid.Table>
			</DataGrid>,
		)
		expect(container.querySelector('tfoot')).toBeNull()
	})

	it('renders one cell per column from the column footers', () => {
		const { container } = renderWithComponents(
			<DataGrid table={makeInstance()}>
				<DataGrid.Table>
					<DataGrid.Header />
					<DataGrid.Body />
					<DataGrid.Footer />
				</DataGrid.Table>
			</DataGrid>,
		)
		const cells = container.querySelectorAll('tfoot td')
		expect(Array.from(cells).map((c) => c.textContent)).toEqual(['Total', '42'])
	})

	it('hands the render function the table and its footer groups', () => {
		const { container } = renderWithComponents(
			<DataGrid table={makeInstance()}>
				<DataGrid.Table>
					<DataGrid.Body />
					<DataGrid.Footer>
						{({ table, footerGroups }) => (
							<tr>
								<td colSpan={footerGroups[0]?.headers.length}>{table.getRowModel().rows.length} rows</td>
							</tr>
						)}
					</DataGrid.Footer>
				</DataGrid.Table>
			</DataGrid>,
		)
		expect(container.querySelector('tfoot td')?.textContent).toBe('2 rows')
		expect(container.querySelector('tfoot td')?.getAttribute('colspan')).toBe('2')
	})
})

/**
 * Header used to be the one structural slot with no escape hatch: customising the header row
 * meant replacing the whole `<DataGrid.Table>` body, which also gave up pinning, sticky
 * positioning and virtualization.
 */
describe('<DataGrid.Header> children', () => {
	it('renders the built-in header rows when no children are supplied', () => {
		const { container } = renderWithComponents(<DataGrid table={makeInstance()} />)
		expect(Array.from(container.querySelectorAll('thead th')).map((c) => c.textContent)).toEqual(['Name', 'Amount'])
	})

	it('replaces the header rows with a render function, keeping the kit thead', () => {
		const { container } = renderWithComponents(
			<DataGrid table={makeInstance()}>
				<DataGrid.Table>
					<DataGrid.Header>
						{({ headerGroups }) =>
							headerGroups.map((group) => (
								<tr key={group.id}>
									{group.headers.map((header) => (
										<th key={header.id}>{header.column.id.toUpperCase()}</th>
									))}
								</tr>
							))
						}
					</DataGrid.Header>
					<DataGrid.Body />
				</DataGrid.Table>
			</DataGrid>,
		)
		expect(Array.from(container.querySelectorAll('thead th')).map((c) => c.textContent)).toEqual(['NAME', 'AMOUNT'])
		expect(container.querySelector('thead')?.getAttribute('data-slot')).toBe('thead')
	})

	it('accepts plain element children too', () => {
		const { container } = renderWithComponents(
			<DataGrid table={makeInstance()}>
				<DataGrid.Table>
					<DataGrid.Header>
						<tr>
							<th>Custom</th>
						</tr>
					</DataGrid.Header>
					<DataGrid.Body />
				</DataGrid.Table>
			</DataGrid>,
		)
		expect(container.querySelector('thead th')?.textContent).toBe('Custom')
	})
})

/**
 * The five slots whose derivation is expensive to repeat. Each hands its settled model to a
 * render function so a custom control never has to re-derive it — the point being the parts
 * that are easy to get subtly wrong: pagination's trusted-total rules, the selection bar's
 * confirmation protocol, the per-entry sort column lists, the resolved filter inputs.
 */
describe('compound render-prop slots', () => {
	it('<DataGrid.Pagination> hands over the settled page model', () => {
		const table = prepareDataGridTable(
			createTable<User>({ data: USERS, columns: COLUMNS, pagination: { pageSize: 1 } }),
		)
		const { container } = renderWithComponents(
			<DataGrid table={table}>
				<DataGrid.Pagination>
					{({ pageIndex, pageCount, rowCount, canPreviousPage, canNextPage }) => (
						<p>{[pageIndex, pageCount, rowCount, canPreviousPage, canNextPage].join(' ')}</p>
					)}
				</DataGrid.Pagination>
			</DataGrid>,
		)
		// Client-side pagination: both totals are trusted, so neither is undefined.
		expect(container.querySelector('p')?.textContent).toBe('0 2 2 false true')
	})

	it('<DataGrid.Pagination> stays hidden in the states that hide the built-in footer', () => {
		const table = prepareDataGridTable(createTable<User>({ data: USERS, columns: COLUMNS }))
		const { container } = renderWithComponents(
			<DataGrid table={table}>
				<DataGrid.Pagination>{() => <p>never</p>}</DataGrid.Pagination>
			</DataGrid>,
		)
		// No pagination row model → no footer, and therefore no children either.
		expect(container.querySelector('p')).toBeNull()
	})

	it('<DataGrid.SelectionBar> hands over a confirmation-aware onDelete', () => {
		const onDelete = vi.fn()
		const table = prepareDataGridTable(
			createTable<User>({
				data: USERS,
				columns: COLUMNS,
				selection: true,
				deleting: { onDelete: () => {}, bulk: { onDelete, confirmation: true } },
			}),
		)
		table.grid.selection.bar = true
		table.setState((prev) => ({ ...prev, rowSelection: { '1': true } }))

		const { container } = renderWithComponents(
			<DataGrid table={table}>
				<DataGrid.SelectionBar>
					{({ count, open, onDelete: del }) => (
						<button
							type='button'
							data-count={count}
							data-open={String(open)}
							onClick={del}
						>
							delete
						</button>
					)}
				</DataGrid.SelectionBar>
			</DataGrid>,
		)
		const button = container.querySelector('button')
		expect(button).not.toBeNull()
		expect(button?.getAttribute('data-count')).toBe('1')
		expect(button?.getAttribute('data-open')).toBe('true')

		// With `confirmation` on, the click stages a pending bulk delete rather than running
		// the handler — the ConfirmDialog runs it on confirm.
		if (button) fireEvent.click(button)
		expect(onDelete).not.toHaveBeenCalled()
		expect(table.getState().deleting.pendingBulk).toBe(true)
	})

	it('<DataGrid.SortMenuTrigger> excludes already-used columns from each entry', () => {
		const table = prepareDataGridTable(createTable<User>({ data: USERS, columns: COLUMNS, sorting: true }))
		table.setState((prev) => ({ ...prev, sorting: [{ id: 'name', desc: false }] }))

		const { container } = renderWithComponents(
			<DataGrid table={table}>
				<DataGrid.SortMenuTrigger>
					{({ items, sortableColumns, canAddSort }) => (
						<p>
							{[items[0]?.availableColumns.map((c) => c.id).join(','), sortableColumns.length, canAddSort].join(' | ')}
						</p>
					)}
				</DataGrid.SortMenuTrigger>
			</DataGrid>,
		)
		// 'name' is this entry's own column so it stays offered; 'amount' is still free.
		expect(container.querySelector('p')?.textContent).toBe('name,amount | 2 | true')
	})

	it('<DataGrid.VisibilityTrigger> hands over the toggleable columns', () => {
		const table = prepareDataGridTable(createTable<User>({ data: USERS, columns: COLUMNS, visibility: true }))
		const { container } = renderWithComponents(
			<DataGrid table={table}>
				<DataGrid.VisibilityTrigger>
					{({ columns }) => <p>{columns.map((c) => `${c.id}:${String(c.isVisible)}`).join(' ')}</p>}
				</DataGrid.VisibilityTrigger>
			</DataGrid>,
		)
		expect(container.querySelector('p')?.textContent).toBe('name:true amount:true')
	})

	it('<DataGrid.FilterPanel> hands over a ready-made input per column', () => {
		const table = prepareDataGridTable(createTable<User>({ data: USERS, columns: COLUMNS, filtering: true }))
		const { container } = renderWithComponents(
			<DataGrid table={table}>
				<DataGrid.FilterPanel>
					{({ columns, hasActiveFilter }) => (
						<div data-active={String(hasActiveFilter)}>
							{columns.map(({ column, label, input }) => (
								<label key={column.id}>
									{label}
									{input}
								</label>
							))}
						</div>
					)}
				</DataGrid.FilterPanel>
			</DataGrid>,
		)
		expect(container.querySelector('div[data-active]')?.getAttribute('data-active')).toBe('false')
		expect(Array.from(container.querySelectorAll('label')).map((l) => l.textContent)).toEqual(['Name', 'Amount'])
		// The resolved control, not a placeholder the caller would have to build.
		expect(container.querySelectorAll('label input')).toHaveLength(2)
	})
})

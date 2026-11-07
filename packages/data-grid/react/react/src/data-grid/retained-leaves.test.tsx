import { SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'
import { act, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createColumns } from '../react-columns'
import { renderGrid } from '../test-utils'

import { CreatingRow } from './creating-row'
import { DataGrid } from './data-grid'
import { ExpandedRow } from './expanded-row'

import type { ReactNode } from 'react'

function required<T>(value: T | null | undefined): T {
	if (value == null) throw new Error('Expected a rendered model or element')
	return value
}

const DATA = [
	{ id: 1, name: 'Ann', amount: 10 },
	{ id: 2, name: 'Bob', amount: 20 },
]
const COLUMNS = createColumns<(typeof DATA)[number]>([
	{ accessorKey: 'name', header: 'Name', width: 100 },
	{ accessorKey: 'amount', header: 'Amount', width: 150, aggregation: 'sum' },
])

// A parent may retain the leaf elements. Recreating them would mask a missing subscription.
function retainedLayout() {
	let headers: ReactNode
	let rows: ReactNode
	let footers: ReactNode
	return (
		<DataGrid.Table>
			<DataGrid.Header>
				{({ headerGroups }) =>
					(headers ??= (
						<tr>
							{required(headerGroups[0]).headers.map((header) => (
								<DataGrid.HeaderCell
									key={header.id}
									header={header}
								/>
							))}
						</tr>
					))
				}
			</DataGrid.Header>
			<DataGrid.Body>
				{({ rows: model }) =>
					(rows ??= model.map((row) => (
						<DataGrid.Row
							key={row.id}
							row={row}
						>
							{row.getVisibleCells().map((cell) => (
								<DataGrid.Cell
									key={cell.id}
									cell={cell}
									row={row}
								/>
							))}
						</DataGrid.Row>
					)))
				}
			</DataGrid.Body>
			<DataGrid.Footer>
				{({ footerGroups }) =>
					(footers ??= (
						<tr>
							{required(footerGroups[0]).headers.map((header) => (
								<DataGrid.FooterCell
									key={header.id}
									header={header}
								/>
							))}
						</tr>
					))
				}
			</DataGrid.Footer>
		</DataGrid.Table>
	)
}

describe('retained leaf composition', () => {
	it('updates a retained header sorting direction and draft marker through separate apply', () => {
		const { container, table } = renderGrid(
			{ data: DATA, columns: COLUMNS, sorting: { manual: true }, draft: true },
			retainedLayout(),
		)
		const header = required(container.querySelector<HTMLTableCellElement>('th[data-column-id="amount"]'))
		act(() => {
			table.setSorting([{ id: 'amount', desc: true }])
		})
		expect(header).toHaveAttribute('aria-sort', 'descending')
		expect(header).toHaveAttribute('data-draft-sorting', '0')
		act(() => {
			table.draft.apply()
		})
		expect(header).not.toHaveAttribute('data-draft-sorting')
	})

	it('updates a retained grouped column header menu from group to ungroup', () => {
		const { container, table } = renderGrid({ data: DATA, columns: COLUMNS, grouping: true }, retainedLayout())
		const header = required(container.querySelector<HTMLElement>('th[data-column-id="amount"]'))
		expect(within(header).getByRole('button', { name: 'Group by this column' })).toBeInTheDocument()
		act(() => {
			table.setGrouping(['amount'])
		})
		expect(within(header).getByRole('button', { name: 'Ungroup' })).toBeInTheDocument()
	})

	it('refreshes retained footer totals when filtering changes the aggregation', () => {
		const { container, table } = renderGrid({ data: DATA, columns: COLUMNS, filtering: true }, retainedLayout())
		expect(container.querySelector('tfoot')).toHaveTextContent('30')
		act(() => {
			table.setColumnFilters([{ id: 'name', value: 'Ann' }])
		})
		expect(container.querySelector('tfoot')).toHaveTextContent('10')
	})

	it('refreshes pinning and neighbour resize offsets on retained data cells', () => {
		const { container, table } = renderGrid(
			{ data: DATA, columns: COLUMNS, selection: true, pinning: { column: true }, resizing: true },
			retainedLayout(),
		)
		act(() => {
			table.setColumnPinning({ start: ['name', 'amount'], end: [] })
		})
		const header = required(container.querySelector<HTMLTableCellElement>('th[data-column-id="amount"]'))
		const cell = required(container.querySelector<HTMLElement>('tbody tr td:last-child'))
		expect(header).toHaveAttribute('data-pinned', 'start')
		expect(cell).toHaveAttribute('data-pinned', 'start')
		const previousOffset = cell.style.getPropertyValue('--dg-pin-start')
		act(() => {
			table.setColumnSizing({ name: 210 })
		})
		expect(cell.style.getPropertyValue('--dg-pin-start')).not.toBe(previousOffset)
		expect(header.style.getPropertyValue('--dg-pin-start')).toBe(cell.style.getPropertyValue('--dg-pin-start'))
		act(() => {
			table.setColumnPinning({ start: [], end: ['amount'] })
		})
		expect(cell).toHaveAttribute('data-pinned', 'end')
		expect(required(container.querySelector('tfoot tr')).lastElementChild).toHaveAttribute('data-pinned', 'end')
		act(() => {
			table.setColumnPinning({ start: [], end: [] })
		})
		expect(cell).not.toHaveAttribute('data-pinned')
	})

	it('updates a retained system cell when another pinned system column is resized', () => {
		const { container, table } = renderGrid(
			{
				data: DATA,
				columns: COLUMNS,
				selection: true,
				expanding: { component: () => <span>Detail</span> },
				resizing: true,
			},
			retainedLayout(),
		)
		const cell = required(container.querySelector<HTMLElement>('tbody [data-system-column="expand"]'))
		const before = cell.style.getPropertyValue('--dg-pin-start')
		act(() => {
			table.setColumnSizing({ [SELECTION_COLUMN_ID]: 120 })
		})
		expect(cell.style.getPropertyValue('--dg-pin-start')).not.toBe(before)
	})

	it('refreshes retained select-all and filter controls independently', () => {
		const { container, table } = renderGrid(
			{ data: DATA, columns: COLUMNS, selection: true, filtering: true, globalFiltering: true },
			retainedLayout(),
		)
		const checkbox = required(container.querySelector('thead input[type="checkbox"]'))
		act(() => {
			table.setRowSelection({ '1': true })
		})
		expect(checkbox).not.toBeChecked()
		act(() => {
			table.setGlobalFilter('Ann')
		})
		expect(checkbox).toBeChecked()
		act(() => {
			table.setColumnFilters([{ id: 'name', value: 'Ann' }])
		})
		expect(container.querySelector('th[data-column-id="name"] input')).toHaveValue('Ann')
	})

	it('keeps the creation fields in visual order and updates pinned offsets without replacing inputs', () => {
		const { container, table } = renderGrid(
			{
				data: DATA,
				columns: COLUMNS,
				creating: { mode: 'pin-row', onSave: () => {} },
				ordering: { column: true },
				grouping: true,
				pinning: { column: true },
				resizing: true,
			},
			<DataGrid.Table>
				<DataGrid.Body>
					<CreatingRow />
				</DataGrid.Body>
			</DataGrid.Table>,
		)
		const names = () =>
			Array.from(container.querySelectorAll('[data-creating-row] input')).map((input) =>
				input.getAttribute('aria-label'),
			)
		expect(names()).toEqual(['Name', 'Amount'])
		const nameInput = required(container.querySelector<HTMLInputElement>('input[aria-label="Name"]'))
		nameInput.focus()
		act(() => {
			table.setColumnOrder(['amount', 'name'])
		})
		expect(names()).toEqual(['Amount', 'Name'])
		expect(document.activeElement).toBe(nameInput)
		act(() => {
			table.setColumnPinning({ start: ['amount', 'name'], end: [] })
		})
		const nameCell = required(nameInput.closest('td'))
		act(() => {
			table.setColumnSizing({ amount: 250 })
		})
		expect(nameCell.style.getPropertyValue('--dg-pin-start')).toBe(
			`${String(required(table.getColumn('name')).getStart('start'))}px`,
		)
		act(() => {
			table.setGrouping(['amount'])
		})
		expect(names()).toEqual(['Name'])
	})

	it('updates a retained detail row colspan when grouping removes a column', () => {
		let detail: ReactNode
		const { container, table } = renderGrid(
			{ data: DATA, columns: COLUMNS, grouping: true, expanding: { component: () => <span>Detail</span> } },
			<DataGrid.Table>
				<DataGrid.Body>{({ rows }) => (detail ??= <ExpandedRow row={required(rows[0])} />)}</DataGrid.Body>
			</DataGrid.Table>,
		)
		const cell = required(container.querySelector('[data-expanded-row] td'))
		const original = Number(cell.getAttribute('colspan'))
		act(() => {
			table.setGrouping(['amount'])
		})
		expect(cell).toHaveAttribute('colspan', String(original - 1))
	})

	it('keeps opaque header templates live while leaving unchanged row counts alone', () => {
		const name = vi.fn(() => 'Name')
		const rowCount = vi.fn(({ count }: { count: number }) => `${String(count)} rows`)
		const columns = createColumns<(typeof DATA)[number]>([
			{ accessorKey: 'name', header: name },
			{ accessorKey: 'amount', header: 'Amount' },
		])
		const { table } = renderGrid(
			{ data: DATA, columns, selection: true, editing: { onSave: () => {} }, messages: { grid: { rowCount } } },
			retainedLayout(),
		)
		const nameRenders = name.mock.calls.length
		const countRenders = rowCount.mock.calls.length
		act(() => {
			table.setRowSelection({ '1': true })
		})
		expect(name).toHaveBeenCalledTimes(nameRenders + 1)
		act(() => {
			table.editing.start('2')
		})
		expect(name).toHaveBeenCalledTimes(nameRenders + 2)
		expect(rowCount).toHaveBeenCalledTimes(countRenders)
	})

	it('keeps a retained filter panel in the documented column order', () => {
		const { getByTestId, table } = renderGrid(
			{ data: DATA, columns: COLUMNS, filtering: true, ordering: { column: true } },
			<DataGrid.FilterPanel>
				{({ filters }) => <span data-testid='filter-order'>{filters.map((filter) => filter.id).join(',')}</span>}
			</DataGrid.FilterPanel>,
		)
		expect(getByTestId('filter-order')).toHaveTextContent('name,amount')
		act(() => {
			table.setColumnOrder(['amount', 'name'])
		})
		expect(getByTestId('filter-order')).toHaveTextContent('amount,name')
	})
})

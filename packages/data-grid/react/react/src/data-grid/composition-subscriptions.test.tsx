import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	rowSortingFeature,
	draftFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { createColumns } from '../react-columns'
import { renderGrid, testComponents } from '../test-utils'

import { DataGrid } from './data-grid'

const DATA = [
	{ id: 1, team: 'eng', amount: 10 },
	{ id: 2, team: 'eng', amount: 20 },
	{ id: 3, team: 'design', amount: 40 },
]
const COLUMNS = createColumns<(typeof DATA)[number]>([
	{ accessorKey: 'team', header: 'Team', footer: 'Total' },
	{ accessorKey: 'amount', header: 'Amount', aggregation: 'sum' },
])

// Hoisted elements deliberately keep parent re-renders from repairing missing subscriptions.
const LAYOUT = (
	<DataGrid.Table>
		<DataGrid.Header />
		<DataGrid.Body />
		<DataGrid.Footer />
	</DataGrid.Table>
)

describe('composition subscription boundaries', () => {
	it('updates footer totals independently when filtering changes the rows', () => {
		const { container, table } = renderGrid({ data: DATA, columns: COLUMNS, filtering: true }, LAYOUT)
		expect(container.querySelector('tfoot')?.textContent).toBe('Total70')
		act(() => {
			table.setColumnFilters([{ id: 'team', value: 'eng' }])
		})
		expect(container.querySelector('tbody')?.textContent).not.toContain('40')
		expect(container.querySelector('tfoot')?.textContent).toBe('Total30')
		act(() => {
			table.setColumnFilters([])
		})
		expect(container.querySelector('tfoot')?.textContent).toBe('Total70')
	})

	it('keeps footer columns aligned when grouping removes the grouped column', () => {
		const { container, table } = renderGrid({ data: DATA, columns: COLUMNS, grouping: true }, LAYOUT)
		act(() => {
			table.setGrouping(['team'])
		})
		const headers = Array.from(container.querySelectorAll('thead th')).map((cell) =>
			cell.getAttribute('data-column-id'),
		)
		const footers = Array.from(container.querySelectorAll('tfoot td'))
		expect(footers).toHaveLength(headers.length)
		expect(container.querySelector('tfoot')?.textContent).not.toContain('Total')
		act(() => {
			table.setGrouping([])
		})
		expect(container.querySelector('tfoot')?.textContent).toBe('Total70')
	})

	it('updates a static pagination component when grouping changes page count', () => {
		const { getByTestId, table } = renderGrid(
			{ data: DATA, columns: COLUMNS, grouping: true, pagination: { pageSize: 1 } },
			<>
				<DataGrid.Table>
					<DataGrid.Body />
				</DataGrid.Table>
				<DataGrid.Pagination>{({ pageCount }) => <span data-testid='pages'>{pageCount}</span>}</DataGrid.Pagination>
			</>,
		)
		expect(getByTestId('pages')).toHaveTextContent('3')
		act(() => {
			table.setGrouping(['team'])
		})
		expect(getByTestId('pages')).toHaveTextContent('2')
		act(() => {
			table.setGrouping([])
		})
		expect(getByTestId('pages')).toHaveTextContent('3')
	})

	it('keeps statically supplied Row elements reactive to their visible cell list', () => {
		// A custom body may retain row elements: rows themselves stay the same on a column edit.
		let retainedRows: React.ReactNode
		const { container, table } = renderGrid(
			{ data: DATA, columns: COLUMNS, visibility: true, pinning: { column: true } },
			<DataGrid.Table>
				<DataGrid.Header />
				<DataGrid.Body>
					{({ rows }) => {
						retainedRows ??= rows.map((row) => (
							<DataGrid.Row
								key={row.id}
								row={row}
							/>
						))
						return retainedRows
					}}
				</DataGrid.Body>
			</DataGrid.Table>,
		)
		expect(container.querySelectorAll('tbody td')).toHaveLength(6)
		act(() => {
			table.setColumnVisibility({ amount: false })
		})
		expect(container.querySelectorAll('tbody td')).toHaveLength(3)
		act(() => {
			table.setColumnVisibility({})
		})
		act(() => {
			table.setColumnPinning({ start: ['amount'], end: [] })
		})
		expect(Array.from(container.querySelectorAll('tbody tr')).map((row) => row.textContent)).toEqual([
			'10eng',
			'20eng',
			'40design',
		])
		act(() => {
			table.setColumnPinning({ start: [], end: ['team'] })
		})
		expect(Array.from(container.querySelectorAll('tbody tr')).map((row) => row.textContent)).toEqual([
			'10eng',
			'20eng',
			'40design',
		])
		act(() => {
			table.setColumnPinning({ start: [], end: [] })
		})
		expect(Array.from(container.querySelectorAll('tbody tr')).map((row) => row.textContent)).toEqual([
			'eng10',
			'eng20',
			'design40',
		])
		act(() => {
			table.setColumnOrder(['amount', 'team'])
		})
		expect(Array.from(container.querySelectorAll('tbody tr')).map((row) => row.textContent)).toEqual([
			'10eng',
			'20eng',
			'40design',
		])
	})
})

const NARROW_COLUMNS = createColumns<(typeof DATA)[number]>([
	{ accessorKey: 'team', header: 'Team' },
	{ accessorKey: 'amount', header: 'Amount' },
])
const NARROW_FEATURES = tableFeatures({
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	rowSortingFeature,
	draftFeature,
})
const { DataGrid: NarrowGrid, useDataGrid: useNarrowGrid } = createDataGrid({
	components: testComponents,
	features: NARROW_FEATURES,
})

it('refreshes static composition on a new data prop without a pagination reset', () => {
	function Harness({ data }: { data: typeof DATA }) {
		return (
			<NarrowGrid
				data={data}
				columns={NARROW_COLUMNS}
			>
				{LAYOUT}
			</NarrowGrid>
		)
	}
	const view = render(<Harness data={DATA} />)
	expect(view.container.querySelector('tbody')?.textContent).toContain('40')
	view.rerender(<Harness data={DATA.map((row) => ({ ...row, amount: row.amount + 1 }))} />)
	expect(view.container.querySelector('tbody')?.textContent).toContain('41')
	expect(view.container.querySelector('tbody')?.textContent).not.toContain('40')
})

it('clears the draft sorting marker after a separate apply without a selection feature', () => {
	let table: ReturnType<typeof useNarrowGrid<(typeof DATA)[number]>>
	function Harness() {
		table = useNarrowGrid({ data: DATA, columns: NARROW_COLUMNS, sorting: { manual: true }, draft: true })
		return <NarrowGrid table={table}>{LAYOUT}</NarrowGrid>
	}
	const view = render(<Harness />)
	act(() => {
		table.setSorting([{ id: 'amount', desc: true }])
	})
	expect(view.container.querySelector('[data-draft-sorting]')).not.toBeNull()
	act(() => {
		table.draft.apply()
	})
	expect(view.container.querySelector('[data-draft-sorting]')).toBeNull()
})

it('publishes imperative setData updates to static children', () => {
	let table: ReturnType<typeof useNarrowGrid<(typeof DATA)[number]>>
	function Harness() {
		table = useNarrowGrid({ data: DATA, columns: NARROW_COLUMNS })
		return <NarrowGrid table={table}>{LAYOUT}</NarrowGrid>
	}
	const view = render(<Harness />)
	act(() => {
		table.setData([{ id: 4, team: 'support', amount: 90 }])
	})
	expect(view.container.querySelector('tbody')?.textContent).toBe('support90')
})

it('refreshes static header and body when column definitions change', () => {
	function Harness({ columns }: { columns: typeof NARROW_COLUMNS }) {
		return (
			<NarrowGrid
				data={DATA}
				columns={columns}
			>
				{LAYOUT}
			</NarrowGrid>
		)
	}
	const view = render(<Harness columns={NARROW_COLUMNS} />)
	view.rerender(
		<Harness columns={createColumns<(typeof DATA)[number]>([{ accessorKey: 'team', header: 'Department' }])} />,
	)
	expect(view.container.querySelector('thead')?.textContent).toBe('Department')
	expect(Array.from(view.container.querySelectorAll('tbody tr')).map((row) => row.textContent)).toEqual([
		'eng',
		'eng',
		'design',
	])
})

it('refreshes select-all after global filtering changes which rows count as all', () => {
	const { container, table } = renderGrid(
		{ data: DATA, columns: COLUMNS, selection: true, globalFiltering: true },
		LAYOUT,
	)
	const selectAll = container.querySelector('thead input[type="checkbox"]')
	act(() => {
		table.setRowSelection({ '1': true, '2': true })
	})
	expect(selectAll).not.toBeChecked()
	act(() => {
		table.setGlobalFilter('eng')
	})
	expect(selectAll).toBeChecked()
	act(() => {
		table.setGlobalFilter('')
	})
	expect(selectAll).not.toBeChecked()
})

import { createTable, createColumns } from '@ez-kit/data-grid-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { prepareDataGridTable } from '../prepare-table'
import { TEST_FEATURES, testComponents } from '../test-utils'

import type { DataTable, GridFeatures } from '../types'
import type { StructuredFilterValue } from '@ez-kit/data-grid-core'

type Row = {
	id: number
	status: 'open' | 'done' | 'cancelled'
}

const DATA: Row[] = [
	{ id: 1, status: 'open' },
	{ id: 2, status: 'done' },
	{ id: 3, status: 'done' },
	{ id: 4, status: 'cancelled' },
]

const COLUMNS = createColumns<Row>([
	{
		accessorKey: 'status',
		header: 'Status',
		cell: {
			type: 'select',
			config: {
				items: [
					{ value: 'open', label: 'Open' },
					{ value: 'done', label: 'Done' },
					{ value: 'cancelled', label: 'Cancelled' },
				],
			},
		},
		filtering: { operators: true },
	},
])

const { DataGrid, GridComponentsProvider } = createDataGrid({
	components: testComponents,
})

function setup(config?: Partial<Parameters<typeof createTable<GridFeatures, Row>>[0]>): DataTable<GridFeatures, Row> {
	const table = prepareDataGridTable(
		createTable<GridFeatures, Row>({
			features: TEST_FEATURES,
			data: DATA,
			columns: COLUMNS,
			filtering: true,
			...config,
		}),
	)
	render(
		<GridComponentsProvider>
			<DataGrid table={table} />
		</GridComponentsProvider>,
	)
	return table
}

describe('renderFilterInput — multi-value (in / notIn) branch', () => {
	it('renders MultiSelectFilter with options resolved from cell config for select columns', () => {
		setup()

		// All three options from cell.config.items are rendered as checkbox labels.
		expect(screen.getByText('Open')).toBeInTheDocument()
		expect(screen.getByText('Done')).toBeInTheDocument()
		expect(screen.getByText('Cancelled')).toBeInTheDocument()

		// No counts when faceted is disabled.
		expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument()
	})

	it('checking an option dispatches setFilterValue with { operator: "in", value: [...] }', () => {
		const table = setup()

		const openCheckbox = screen.getByRole('checkbox', { name: /Open/ })
		fireEvent.click(openCheckbox)

		const statusCol = table.getColumn('status')
		const filterValue = statusCol?.getFilterValue() as StructuredFilterValue | undefined
		expect(filterValue?.operator).toBe('in')
		expect(filterValue?.value).toEqual(['open'])
	})

	it('renders faceted counts when filtering.faceted: true', () => {
		setup({ filtering: { faceted: true } })

		// "Done" appears in two rows, "Open" once, "Cancelled" once.
		const countSlots = screen.getAllByText(/^[1-9]\d*$/)
		const counts = countSlots.map((el) => el.textContent)
		expect(counts).toContain('1')
		expect(counts).toContain('2')
	})
})

describe('OperatorSelect — operator options read as text labels', () => {
	it('renders every operator option as its English label, with no symbol glyphs', () => {
		setup()

		// A `select` column resolves to IN_OPERATORS + the text empty operators.
		for (const label of ['Is any of', 'Is none of', 'Is empty', 'Is not empty']) {
			expect(screen.getByRole('option', { name: label })).toBeInTheDocument()
		}

		// The glyphs these operators used to render (∈ / ∉ / ∅ / ≠∅) are gone.
		for (const glyph of ['∈', '∉', '∅', '≠∅']) {
			expect(screen.queryByText(glyph)).not.toBeInTheDocument()
		}
	})
})

type DateRow = { id: number; joinedAt: string }

const DATE_DATA: DateRow[] = [
	{ id: 1, joinedAt: '2026-05-10' },
	{ id: 2, joinedAt: '2026-05-12' },
]

const DATE_COLUMNS_WITH_PRESETS = createColumns<DateRow>([
	{
		accessorKey: 'joinedAt',
		header: 'Joined',
		cell: { type: 'date' },
		filtering: {
			presets: true,
			operators: { items: ['equals', 'between'] },
			defaultOperator: 'between',
		},
	},
])

function setupDate(): DataTable<GridFeatures, DateRow> {
	const table = prepareDataGridTable(
		createTable<GridFeatures, DateRow>({
			features: TEST_FEATURES,
			data: DATE_DATA,
			columns: DATE_COLUMNS_WITH_PRESETS,
			filtering: true,
		}),
	)
	render(
		<GridComponentsProvider>
			<DataGrid table={table} />
		</GridComponentsProvider>,
	)
	return table
}

/** The operator control is an unlabelled `<select>` in the test kit — the date column has one. */
function selectOperator(operatorId: string): void {
	const [select] = screen.getAllByRole('combobox')
	if (!select) throw new Error('expected an operator select')
	fireEvent.change(select, { target: { value: operatorId } })
}

describe('renderFilterInput — date presets', () => {
	it('offers the built-in ranges to between', () => {
		setupDate()

		expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'This month' })).toBeInTheDocument()
		// A single-date preset means nothing to `between`.
		expect(screen.queryByRole('button', { name: 'A week ago' })).not.toBeInTheDocument()
	})

	it('offers the single dates to an operator that takes one value', () => {
		setupDate()
		selectOperator('equals')

		expect(screen.getByRole('button', { name: 'A week ago' })).toBeInTheDocument()
		// A range means nothing to an operator that compares against one date.
		expect(screen.queryByRole('button', { name: 'This month' })).not.toBeInTheDocument()
	})

	it('writes the date itself when a single-date preset is picked', () => {
		const table = setupDate()
		selectOperator('equals')

		fireEvent.click(screen.getByRole('button', { name: 'Today' }))

		const filterValue = table.getColumn('joinedAt')?.getFilterValue() as StructuredFilterValue | undefined
		expect(filterValue?.operator).toBe('equals')
		expect(filterValue?.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	})

	it('clicking a range preset dispatches setFilterValue with the resolved range', () => {
		const table = setupDate()
		fireEvent.click(screen.getByRole('button', { name: 'Today' }))

		const filterValue = table.getColumn('joinedAt')?.getFilterValue() as StructuredFilterValue | undefined
		expect(filterValue?.operator).toBe('between')
		const range = filterValue?.value as { from?: string; to?: string } | undefined
		expect(typeof range?.from).toBe('string')
		expect(typeof range?.to).toBe('string')
		expect(range?.from).toBe(range?.to)
		// `today` preset returns ISO date-only string (YYYY-MM-DD, length 10).
		expect(range?.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	})
})

type NumberRow = { id: number; salary: number }

const NUMBER_DATA: NumberRow[] = [
	{ id: 1, salary: 50 },
	{ id: 2, salary: 90 },
]

function setupNumber(betweenOperator: { slider?: boolean; min?: number; max?: number }): void {
	const columns = createColumns<NumberRow>([
		{
			accessorKey: 'salary',
			header: 'Salary',
			cell: { type: 'number' },
			filtering: { operators: { items: ['between'], betweenOperator }, defaultOperator: 'between' },
		},
	])
	const table = prepareDataGridTable(
		createTable<GridFeatures, NumberRow>({ features: TEST_FEATURES, data: NUMBER_DATA, columns, filtering: true }),
	)
	render(
		<GridComponentsProvider>
			<DataGrid table={table} />
		</GridComponentsProvider>,
	)
}

describe('renderFilterInput — between slider flag (number)', () => {
	it('forwards the slider flag the column declared', () => {
		setupNumber({ slider: true, min: 0, max: 100 })
		expect(document.querySelector('[data-slider="true"]')).not.toBeNull()
	})

	it('omits the slider flag when the column did not ask for one', () => {
		setupNumber({ min: 0, max: 100 })
		expect(document.querySelector('[data-slider]')).toBeNull()
	})
})

describe('renderFilterInput — cell-type filter renderer', () => {
	it('mounts the renderer instead of calling it, so switching operators keeps hooks in order', () => {
		// `flexRender` exists for exactly this: a renderer invoked as `Comp(props)` smuggles its
		// hooks into the header cell's fiber, and swapping one renderer for another — which is what
		// changing the operator does — reorders them. React only says so through `console.error`.
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		setupDate()
		selectOperator('equals')
		selectOperator('between')

		expect(error).not.toHaveBeenCalled()
		error.mockRestore()
	})
})

describe('renderFilterInput — clearing one column', () => {
	it('offers no clear button while the column has no filter', () => {
		setupDate()

		expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
	})

	it('clears the column when the button is pressed', () => {
		const table = setupDate()
		fireEvent.click(screen.getByRole('button', { name: 'Today' }))
		expect(table.getColumn('joinedAt')?.getFilterValue()).toBeDefined()

		fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

		expect(table.getColumn('joinedAt')?.getFilterValue()).toBeUndefined()
	})

	it('clears a column whose operator takes a single date', () => {
		const table = setupDate()
		selectOperator('equals')
		fireEvent.click(screen.getByRole('button', { name: 'Today' }))
		expect(table.getColumn('joinedAt')?.getFilterValue()).toBeDefined()

		fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

		expect(table.getColumn('joinedAt')?.getFilterValue()).toBeUndefined()
	})
})

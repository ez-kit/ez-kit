import { createTable, defineColumns } from '@ez-kit/data-grid-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { createDataGridInstance } from '../data-grid-instance'
import { testComponents } from '../test-utils'

import type { DataTable, StructuredFilterValue } from '@ez-kit/data-grid-core'

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

const COLUMNS = defineColumns<Row>([
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

function setup(config?: Partial<Parameters<typeof createTable<Row>>[0]>): DataTable<Row> {
	const table = createTable<Row>({ data: DATA, columns: COLUMNS, filtering: true, ...config })
	const instance = createDataGridInstance(table)
	render(
		<GridComponentsProvider>
			<DataGrid table={instance} />
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

const DATE_COLUMNS_WITH_PRESETS = defineColumns<DateRow>([
	{
		accessorKey: 'joinedAt',
		header: 'Joined',
		cell: { type: 'date' },
		filtering: {
			operators: {
				items: ['eq', 'between'],
				betweenOperator: { variant: 'inputs', presets: true },
			},
			defaultOperator: 'between',
		},
	},
])

function setupDate(): DataTable<DateRow> {
	const table = createTable<DateRow>({ data: DATE_DATA, columns: DATE_COLUMNS_WITH_PRESETS, filtering: true })
	const instance = createDataGridInstance(table)
	render(
		<GridComponentsProvider>
			<DataGrid table={instance} />
		</GridComponentsProvider>,
	)
	return table
}

describe('renderFilterInput — between preset row (date)', () => {
	it('renders built-in preset buttons when betweenOperator.presets: true on a date column', () => {
		setupDate()
		// Built-in DATE_RANGE_PRESETS includes "Today" and "This month".
		expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'This month' })).toBeInTheDocument()
	})

	it('clicking a preset dispatches setFilterValue with the resolved range', () => {
		const table = setupDate()
		const todayBtn = screen.getByRole('button', { name: 'Today' })
		fireEvent.click(todayBtn)

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

import { createTable, defineColumns } from '@ez-kit/data-grid-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { testComponents } from '../test-utils'

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

function setup(config?: Partial<Parameters<typeof createTable<Row>>[0]>) {
	const table = createTable<Row>({ data: DATA, columns: COLUMNS, filtering: true, ...config })
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

import {
	createColumns,
	createTable,
	DEFAULT_OPERATOR_ICONS,
	defaultMessages,
	resolveMessages,
} from '@ez-kit/data-grid-core'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { prepareDataGridTable } from '../prepare-table'
import { TEST_FEATURES, testComponents } from '../test-utils'

import type { ResolvedGridOptions } from '../resolved-options'
import type { GridFeatures } from '../types'
import type { GridMessages } from '@ez-kit/data-grid-core'

type Row = { id: number; name: string; age: number; status: string; city: string; note: string; plain: string }

const DATA: Row[] = [{ id: 1, name: 'Ann', age: 30, status: 'open', city: 'Oslo', note: '', plain: 'x' }]

const { DataGrid, GridComponentsProvider } = createDataGrid({ components: testComponents })

const COLUMNS = createColumns<Row>([
	{ accessorKey: 'name', header: 'Name', filtering: { operators: true } },
	{
		accessorKey: 'age',
		header: 'Age',
		cell: { type: 'number' },
		filtering: { operators: true, defaultOperator: 'between' },
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: { type: 'select', config: { items: [{ value: 'open', label: 'Open' }] } },
		filtering: { operators: true },
	},
	{
		accessorKey: 'city',
		header: 'City',
		filtering: { operators: true, component: () => <input aria-label='Own city filter' /> },
	},
	{ accessorKey: 'note', header: 'Note', filtering: { operators: true, defaultOperator: 'isEmpty' } },
	{ accessorKey: 'plain', header: 'Plain' },
])

function setup(
	config: Record<string, unknown> = {},
	grid: { icons?: ResolvedGridOptions['icons']; messages?: GridMessages } = {},
) {
	const table = prepareDataGridTable(
		createTable<GridFeatures, Row>({
			features: TEST_FEATURES,
			data: DATA,
			columns: COLUMNS,
			filtering: true,
			...config,
		}),
	)
	if (grid.icons) table.grid.icons = grid.icons
	if (grid.messages) table.grid.messages = grid.messages
	const view = render(
		<GridComponentsProvider>
			<DataGrid table={table} />
		</GridComponentsProvider>,
	)
	return { table, ...view }
}

function headerOf(name: string): HTMLElement {
	return screen.getByRole('columnheader', { name: new RegExp(`^${name}`) })
}

describe('operator control sits in the filter row', () => {
	it('puts the operator first in the row of every kind of value control', () => {
		const { container } = setup()

		const operators = container.querySelectorAll("[data-slot='filter-operator']")
		expect(operators).toHaveLength(5)
		for (const operator of operators) {
			const row = operator.parentElement
			expect(row?.dataset.slot).toBe('filter-control')
			const visible = [...(row?.children ?? [])].filter((child) => (child as HTMLElement).dataset.slot !== 'sr-only')
			expect(visible[0]).toBe(operator)
		}
	})

	it('renders no operator outside a filter row', () => {
		const { container } = setup()

		for (const operator of container.querySelectorAll("[data-slot='filter-operator']")) {
			expect(operator.closest("[data-slot='filter-control']")).not.toBeNull()
		}
		expect(container.querySelectorAll("[data-slot='header-extras'] > [data-slot='filter-operator']")).toHaveLength(0)
	})

	it('keeps the multi-select, the range and the column’s own component in the operator’s row', () => {
		setup()

		for (const name of ['Status', 'Age', 'City']) {
			const row = headerOf(name).querySelector("[data-slot='filter-control']")
			expect(row?.querySelector("[data-slot='filter-operator']")).not.toBeNull()
		}
		expect(screen.getByLabelText('Own city filter').closest("[data-slot='filter-control']")).not.toBeNull()
	})

	it('shows the label of an operator that takes no value in place of the value control', () => {
		setup()

		const row = headerOf('Note').querySelector("[data-slot='filter-control']")
		const label = row?.querySelector("[data-slot='filter-operator-label']")
		expect(label?.textContent).toBe('Is empty')
		expect(row?.querySelector('input')).toBeNull()
	})

	it('gives a column without operators no operator control', () => {
		setup()

		expect(headerOf('Plain').querySelector("[data-slot='filter-operator']")).toBeNull()
	})
})

describe('operator control — name, menu and switching', () => {
	it('names the button after the current operator by default', () => {
		setup()

		expect(within(headerOf('Name')).getByRole('button', { name: 'Filter operator: Contains' })).toBeInTheDocument()
	})

	it('names it from the grid’s dictionary', () => {
		setup(
			{},
			{
				messages: resolveMessages({
					operators: { text: { ...defaultMessages.operators.text, contains: 'Содержит' } },
					filtering: { operatorTrigger: ({ label }) => `Оператор: ${label}` },
				}),
			},
		)

		expect(within(headerOf('Name')).getByRole('button', { name: 'Оператор: Содержит' })).toBeInTheDocument()
	})

	it('shows the label when no icon is named', () => {
		setup()

		expect(within(headerOf('Name')).getByRole('button', { name: 'Filter operator: Contains' })).toHaveTextContent(
			'Contains',
		)
	})

	it('shows the icon the grid names, in the button and beside the label in the menu', () => {
		setup({}, { icons: { operators: DEFAULT_OPERATOR_ICONS } })

		const button = within(headerOf('Name')).getByRole('button', { name: 'Filter operator: Contains' })
		expect(button).toHaveTextContent('*a*')
		expect(button).not.toHaveTextContent('Contains')
		fireEvent.click(button)
		expect(screen.getByRole('menuitemradio', { name: 'Starts with' })).toHaveTextContent('a*Starts with')
	})

	it('lists every operator in the menu and marks the current one', () => {
		setup()

		fireEvent.click(within(headerOf('Name')).getByRole('button', { name: 'Filter operator: Contains' }))
		const menu = screen.getByRole('menu', { name: 'Filter operator' })
		expect(within(menu).getByRole('menuitemradio', { name: 'Contains' })).toHaveAttribute('aria-checked', 'true')
		expect(within(menu).getByRole('menuitemradio', { name: 'Starts with' })).toHaveAttribute('aria-checked', 'false')
	})

	it('switches operator through the menu by the same rules as before', () => {
		const { table } = setup()
		act(() => {
			table.setColumnFilters([{ id: 'age', value: { operator: 'equals', value: 10 } }])
		})

		fireEvent.click(screen.getByRole('button', { name: 'Filter operator: Equals' }))
		fireEvent.click(screen.getByRole('menuitemradio', { name: 'Between' }))

		expect(table.store.state.columnFilters).toEqual([{ id: 'age', value: { operator: 'between', value: {} } }])
	})

	it('keeps a label a replacement for a built-in was written with', () => {
		setup({ filtering: { operators: { items: [{ id: 'contains', label: 'Похоже на', filterFn: () => true }] } } })

		expect(within(headerOf('Name')).getByRole('button', { name: 'Filter operator: Похоже на' })).toBeInTheDocument()
	})
})

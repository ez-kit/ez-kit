import { createColumns, createTable, OperatorInput, resolveMessages } from '@ez-kit/data-grid-core'
import { DEFAULT_OPERATOR_ICONS } from '@ez-kit/data-grid-core/operators'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { prepareDataGridTable } from '../prepare-table'
import { TEST_FEATURES, TEST_OPERATORS, testComponents } from '../test-utils'

import type { GridFeatures } from '../types'
import type { FilterOperatorDef, GridMessages, OperatorsConfig } from '@ez-kit/data-grid-core'

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

/** The ready-made set with `text` replaced — the way a project changes one type's operators. */
function withText(text: FilterOperatorDef[]): OperatorsConfig {
	return { ...TEST_OPERATORS, byType: { ...TEST_OPERATORS.byType, text } }
}

function setup(config: Record<string, unknown> = {}, grid: { messages?: GridMessages } = {}) {
	const table = prepareDataGridTable(
		createTable<GridFeatures, Row>({
			features: TEST_FEATURES,
			operators: TEST_OPERATORS,
			data: DATA,
			columns: COLUMNS,
			filtering: true,
			...config,
		}),
	)
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

	it('names it from the grid’s dictionary, around the label of the definition', () => {
		const contains: FilterOperatorDef = {
			id: 'contains',
			label: 'Содержит',
			input: OperatorInput.Single,
			filterFn: () => true,
		}
		setup(
			{ operators: withText([contains]) },
			{ messages: resolveMessages({ filtering: { operatorTrigger: ({ label }) => `Оператор: ${label}` } }) },
		)

		expect(within(headerOf('Name')).getByRole('button', { name: 'Оператор: Содержит' })).toBeInTheDocument()
	})

	it('shows the label when no icon is named', () => {
		setup()

		expect(within(headerOf('Name')).getByRole('button', { name: 'Filter operator: Contains' })).toHaveTextContent(
			'Contains',
		)
	})

	it('shows the icon a definition names, in the button and beside the label in the menu', () => {
		const signed = TEST_OPERATORS.byType.text.map((op) => ({
			...op,
			icon: DEFAULT_OPERATOR_ICONS[op.id],
		}))
		setup({ operators: withText(signed) })

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

	it('shows the label a set’s own definition was written with', () => {
		const contains: FilterOperatorDef = {
			id: 'contains',
			label: 'Похоже на',
			input: OperatorInput.Single,
			filterFn: () => true,
		}
		setup({ operators: withText([contains]) })

		expect(within(headerOf('Name')).getByRole('button', { name: 'Filter operator: Похоже на' })).toBeInTheDocument()
	})
})

describe('operator control — operators of a project’s own', () => {
	it('keeps a custom range operator and both its fields in the operator’s row', () => {
		const notBetween: FilterOperatorDef = {
			id: 'notBetween',
			label: 'Not between',
			input: OperatorInput.Range,
			filterFn: () => true,
		}
		const { table } = setup({
			operators: { ...TEST_OPERATORS, byType: { ...TEST_OPERATORS.byType, number: [notBetween] } },
		})
		act(() => {
			table.setColumnFilters([{ id: 'age', value: { operator: 'notBetween', value: {} } }])
		})

		const row = headerOf('Age').querySelector("[data-slot='filter-control']")
		expect(row?.querySelector("[data-slot='filter-operator']")).not.toBeNull()
		expect(row?.querySelectorAll('input')).toHaveLength(2)
	})

	it('shows the label of a custom operator that takes no value in place of the value control', () => {
		const isToday: FilterOperatorDef = {
			id: 'isToday',
			label: 'Today',
			input: OperatorInput.None,
			filterFn: () => true,
		}
		setup({ operators: withText([isToday]) })

		const row = headerOf('Name').querySelector("[data-slot='filter-control']")
		expect(row?.querySelector("[data-slot='filter-operator-label']")?.textContent).toBe('Today')
		expect(row?.querySelector('input')).toBeNull()
	})
})

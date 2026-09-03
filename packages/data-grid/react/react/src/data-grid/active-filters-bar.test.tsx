import { createTable, createColumns } from '@ez-kit/data-grid-core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { prepareDataGridTable } from '../prepare-table'
import { testComponents } from '../test-utils'

import { ActiveFiltersBar } from './active-filters-bar'
import { TableContext } from './table-context'

import type { NormalizedFilterChipsConfig } from '../use-data-grid'
import type { DataTable } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

type User = {
	id: number
	name: string
	age: number
}

const USERS: User[] = [
	{ id: 1, name: 'Alice', age: 30 },
	{ id: 2, name: 'Bob', age: 40 },
]

const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name', filtering: { operators: true } },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' }, filtering: { operators: true } },
])

function makeTable(config?: Partial<Parameters<typeof createTable<User>>[0]>) {
	const table = createTable<User>({
		data: USERS,
		columns: COLUMNS,
		filtering: true,
		globalFiltering: true,
		...config,
	})
	return prepareDataGridTable(table)
}

function setChipsCfg(table: DataTable<User>, value: NormalizedFilterChipsConfig | undefined) {
	table.grid.filtering.chips = value
}

function Wrapper({ table, children }: { table: DataTable<User>; children: ReactNode }) {
	return (
		<GridComponentsProvider components={testComponents}>
			<TableContext value={table}>{children}</TableContext>
		</GridComponentsProvider>
	)
}

describe('<ActiveFiltersBar>', () => {
	it('renders nothing when no filter is active', () => {
		const table = makeTable()
		const { container } = render(
			<Wrapper table={table}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		expect(container.firstChild).toBeNull()
	})

	it('renders a chip per column filter with header label', () => {
		const table = makeTable()
		table.setColumnFilters([{ id: 'name', value: { operator: 'contains', value: 'ali' } }])

		render(
			<Wrapper table={table}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /remove name filter/i })).toBeInTheDocument()
		expect(screen.getByText('Name')).toBeInTheDocument()
		// `contains` label is `Contains`; chip shows "Contains ali"
		expect(screen.getByText('Contains ali')).toBeInTheDocument()
	})

	it('renders a chip for the global filter when set', () => {
		const table = makeTable()
		table.setGlobalFilter('al')

		render(
			<Wrapper table={table}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		expect(screen.getByText('Search')).toBeInTheDocument()
		expect(screen.getByText('al')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /remove search filter/i })).toBeInTheDocument()
	})

	it('clicking remove clears the matching column filter only', async () => {
		const user = userEvent.setup()
		const table = makeTable()
		table.setColumnFilters([
			{ id: 'name', value: { operator: 'contains', value: 'ali' } },
			{ id: 'age', value: { operator: 'equals', value: 30 } },
		])

		render(
			<Wrapper table={table}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		await user.click(screen.getByRole('button', { name: /remove name filter/i }))
		expect(table.getState().columnFilters).toEqual([{ id: 'age', value: { operator: 'equals', value: 30 } }])
	})

	it('clicking remove on the global chip clears state.globalFilter', async () => {
		const user = userEvent.setup()
		const table = makeTable()
		table.setGlobalFilter('al')

		render(
			<Wrapper table={table}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		await user.click(screen.getByRole('button', { name: /remove search filter/i }))
		expect(table.getState().globalFilter).toBeUndefined()
	})

	it('formats StructuredFilterValue with operator label and value', () => {
		const table = makeTable()
		table.setColumnFilters([{ id: 'name', value: { operator: 'equals', value: 'Alice' } }])

		render(
			<Wrapper table={table}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		// `equals` label is `Equals`
		expect(screen.getByText('Equals Alice')).toBeInTheDocument()
	})

	it('formats between operator with BetweenValue as "Between from – to"', () => {
		const table = makeTable()
		table.setColumnFilters([{ id: 'age', value: { operator: 'between', value: { from: 20, to: 40 } } }])

		render(
			<Wrapper table={table}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		// `between` label is `Between`
		expect(screen.getByText('Between 20 – 40')).toBeInTheDocument()
	})

	it('renders operator-only chip when op.requiresInput is false (isEmpty)', () => {
		const table = makeTable()
		table.setColumnFilters([{ id: 'name', value: { operator: 'isEmpty' } }])

		render(
			<Wrapper table={table}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		// `isEmpty` label is `Is empty` and value is suppressed
		expect(screen.getByText('Is empty')).toBeInTheDocument()
	})

	it('emits data-chip-position from FILTER_CHIPS_KEY', () => {
		const table = makeTable()
		setChipsCfg(table, { position: 'below' })
		table.setGlobalFilter('al')

		const { container } = render(
			<Wrapper table={table}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		const bar = container.querySelector('[data-slot="active-filters-bar"]')
		expect(bar).not.toBeNull()
		expect(bar?.getAttribute('data-chip-position')).toBe('below')
	})
})

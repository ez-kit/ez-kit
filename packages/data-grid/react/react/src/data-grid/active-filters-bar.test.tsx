import { createTable, defineColumns } from '@ez-kit/data-grid-core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { createDataGridInstance } from '../data-grid-instance'
import { testComponents } from '../test-utils'
import { FILTER_CHIPS_KEY } from '../use-data-grid'

import { ActiveFiltersBar } from './active-filters-bar'
import { TableContext } from './table-context'

import type { DataGridInstance } from '../data-grid-instance'
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

const COLUMNS = defineColumns<User>([
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
	return { table, instance: createDataGridInstance(table) }
}

function setChipsCfg(table: DataTable<User>, value: NormalizedFilterChipsConfig | undefined) {
	;(table as unknown as Record<symbol, unknown>)[FILTER_CHIPS_KEY] = value
}

function Wrapper({ instance, children }: { instance: DataGridInstance<User>; children: ReactNode }) {
	return (
		<GridComponentsProvider components={testComponents}>
			<TableContext value={instance}>{children}</TableContext>
		</GridComponentsProvider>
	)
}

describe('<ActiveFiltersBar>', () => {
	it('renders nothing when no filter is active', () => {
		const { instance } = makeTable()
		const { container } = render(
			<Wrapper instance={instance}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		expect(container.firstChild).toBeNull()
	})

	it('renders a chip per column filter with header label', () => {
		const { instance } = makeTable()
		instance.table.setColumnFilters([{ id: 'name', value: { operator: 'contains', value: 'ali' } }])

		render(
			<Wrapper instance={instance}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /remove name filter/i })).toBeInTheDocument()
		expect(screen.getByText('Name')).toBeInTheDocument()
		// `contains` symbol is `⊇`; chip shows "⊇ ali"
		expect(screen.getByText('⊇ ali')).toBeInTheDocument()
	})

	it('renders a chip for the global filter when set', () => {
		const { instance } = makeTable()
		instance.table.setGlobalFilter('al')

		render(
			<Wrapper instance={instance}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		expect(screen.getByText('Search')).toBeInTheDocument()
		expect(screen.getByText('al')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /remove search filter/i })).toBeInTheDocument()
	})

	it('clicking remove clears the matching column filter only', async () => {
		const user = userEvent.setup()
		const { instance } = makeTable()
		instance.table.setColumnFilters([
			{ id: 'name', value: { operator: 'contains', value: 'ali' } },
			{ id: 'age', value: { operator: 'eq', value: 30 } },
		])

		render(
			<Wrapper instance={instance}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		await user.click(screen.getByRole('button', { name: /remove name filter/i }))
		expect(instance.table.getState().columnFilters).toEqual([{ id: 'age', value: { operator: 'eq', value: 30 } }])
	})

	it('clicking remove on the global chip clears state.globalFilter', async () => {
		const user = userEvent.setup()
		const { instance } = makeTable()
		instance.table.setGlobalFilter('al')

		render(
			<Wrapper instance={instance}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		await user.click(screen.getByRole('button', { name: /remove search filter/i }))
		expect(instance.table.getState().globalFilter).toBeUndefined()
	})

	it('formats StructuredFilterValue with operator symbol and value', () => {
		const { instance } = makeTable()
		instance.table.setColumnFilters([{ id: 'name', value: { operator: 'equals', value: 'Alice' } }])

		render(
			<Wrapper instance={instance}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		// `equals` symbol is `=`
		expect(screen.getByText('= Alice')).toBeInTheDocument()
	})

	it('formats between operator with BetweenValue as "↔ from – to"', () => {
		const { instance } = makeTable()
		instance.table.setColumnFilters([{ id: 'age', value: { operator: 'between', value: { from: 20, to: 40 } } }])

		render(
			<Wrapper instance={instance}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		// `between` symbol is `↔`
		expect(screen.getByText('↔ 20 – 40')).toBeInTheDocument()
	})

	it('renders operator-only chip when op.requiresInput is false (isEmpty)', () => {
		const { instance } = makeTable()
		instance.table.setColumnFilters([{ id: 'name', value: { operator: 'isEmpty' } }])

		render(
			<Wrapper instance={instance}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		// `isEmpty` symbol is `∅` and value is suppressed
		expect(screen.getByText('∅')).toBeInTheDocument()
	})

	it('emits data-chip-position from FILTER_CHIPS_KEY', () => {
		const { instance } = makeTable()
		setChipsCfg(instance.table, { position: 'below' })
		instance.table.setGlobalFilter('al')

		const { container } = render(
			<Wrapper instance={instance}>
				<ActiveFiltersBar />
			</Wrapper>,
		)
		const bar = container.querySelector('[data-slot="active-filters-bar"]')
		expect(bar).not.toBeNull()
		expect(bar?.getAttribute('data-chip-position')).toBe('below')
	})
})

import { createTable, createColumns } from '@ez-kit/data-grid-core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { prepareDataGridTable } from '../prepare-table'
import { testComponents } from '../test-utils'

import { ClearFiltersButton } from './clear-filters-button'
import { TableContext } from './table-context'

import type { NormalizedFilteringToolbarConfig } from '../use-data-grid'
import type { DataTable } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

type User = { id: number; name: string }

const USERS: User[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const COLUMNS = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])

function makeTable() {
	const table = createTable<User>({ data: USERS, columns: COLUMNS, filtering: true, globalFiltering: true })
	return prepareDataGridTable(table)
}

function setClearCfg(table: DataTable<User>, value: NormalizedFilteringToolbarConfig | undefined) {
	table.grid.filtering.toolbar = value
}

function Wrapper({ table, children }: { table: DataTable<User>; children: ReactNode }) {
	return (
		<GridComponentsProvider components={testComponents}>
			<TableContext value={table}>{children}</TableContext>
		</GridComponentsProvider>
	)
}

describe('<ClearFiltersButton>', () => {
	it('renders nothing when no filter is active (default)', () => {
		const table = makeTable()
		const { container } = render(
			<Wrapper table={table}>
				<ClearFiltersButton />
			</Wrapper>,
		)
		expect(container.firstChild).toBeNull()
	})

	it('renders when a column filter is active', () => {
		const table = makeTable()
		table.setColumnFilters([{ id: 'name', value: 'al' }])

		render(
			<Wrapper table={table}>
				<ClearFiltersButton />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /clear filters/i })).toBeEnabled()
	})

	it('renders when the global filter is set', () => {
		const table = makeTable()
		table.setGlobalFilter('al')

		render(
			<Wrapper table={table}>
				<ClearFiltersButton />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /clear filters/i })).toBeEnabled()
	})

	it('alwaysShow via prop renders a disabled button when no filter', () => {
		const table = makeTable()

		render(
			<Wrapper table={table}>
				<ClearFiltersButton alwaysShow />
			</Wrapper>,
		)
		const button = screen.getByRole('button', { name: /clear filters/i })
		expect(button).toBeDisabled()
	})

	it('alwaysShow via FILTERING_TOOLBAR_KEY config renders a disabled button when no filter', () => {
		const table = makeTable()
		setClearCfg(table, { alwaysShow: true })

		render(
			<Wrapper table={table}>
				<ClearFiltersButton />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /clear filters/i })).toBeDisabled()
	})

	it('click clears column filters and global filter', async () => {
		const user = userEvent.setup()
		const table = makeTable()
		table.setColumnFilters([{ id: 'name', value: 'al' }])
		table.setGlobalFilter('hello')

		render(
			<Wrapper table={table}>
				<ClearFiltersButton />
			</Wrapper>,
		)
		await user.click(screen.getByRole('button', { name: /clear filters/i }))
		expect(table.getState().columnFilters).toEqual([])
		expect(table.getState().globalFilter).toBeUndefined()
	})

	it('renders custom children when provided', () => {
		const table = makeTable()
		table.setGlobalFilter('al')

		render(
			<Wrapper table={table}>
				<ClearFiltersButton>Reset filters</ClearFiltersButton>
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument()
	})
})

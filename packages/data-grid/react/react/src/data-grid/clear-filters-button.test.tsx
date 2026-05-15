import { createTable, defineColumns } from '@ez-kit/data-grid-core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { createDataGridInstance } from '../data-grid-instance'
import { testComponents } from '../test-utils'
import { FILTER_CLEAR_BUTTON_KEY } from '../use-data-grid'

import { ClearFiltersButton } from './clear-filters-button'
import { TableContext } from './table-context'

import type { DataGridInstance } from '../data-grid-instance'
import type { NormalizedClearButtonConfig } from '../use-data-grid'
import type { DataTable } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

type User = { id: number; name: string }

const USERS: User[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const COLUMNS = defineColumns<User>([{ accessorKey: 'name', header: 'Name' }])

function makeTable() {
	const table = createTable<User>({ data: USERS, columns: COLUMNS, filtering: true, globalFiltering: true })
	return { table, instance: createDataGridInstance(table) }
}

function setClearCfg(table: DataTable<User>, value: NormalizedClearButtonConfig | undefined) {
	;(table as unknown as Record<symbol, unknown>)[FILTER_CLEAR_BUTTON_KEY] = value
}

function Wrapper({ instance, children }: { instance: DataGridInstance<User>; children: ReactNode }) {
	return (
		<GridComponentsProvider components={testComponents}>
			<TableContext value={instance}>{children}</TableContext>
		</GridComponentsProvider>
	)
}

describe('<ClearFiltersButton>', () => {
	it('renders nothing when no filter is active (default)', () => {
		const { instance } = makeTable()
		const { container } = render(
			<Wrapper instance={instance}>
				<ClearFiltersButton />
			</Wrapper>,
		)
		expect(container.firstChild).toBeNull()
	})

	it('renders when a column filter is active', () => {
		const { instance } = makeTable()
		instance.table.setColumnFilters([{ id: 'name', value: 'al' }])

		render(
			<Wrapper instance={instance}>
				<ClearFiltersButton />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /clear filters/i })).toBeEnabled()
	})

	it('renders when the global filter is set', () => {
		const { instance } = makeTable()
		instance.table.setGlobalFilter('al')

		render(
			<Wrapper instance={instance}>
				<ClearFiltersButton />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /clear filters/i })).toBeEnabled()
	})

	it('alwaysShow via prop renders a disabled button when no filter', () => {
		const { instance } = makeTable()

		render(
			<Wrapper instance={instance}>
				<ClearFiltersButton alwaysShow />
			</Wrapper>,
		)
		const button = screen.getByRole('button', { name: /clear filters/i })
		expect(button).toBeDisabled()
	})

	it('alwaysShow via FILTER_CLEAR_BUTTON_KEY config renders a disabled button when no filter', () => {
		const { instance } = makeTable()
		setClearCfg(instance.table, { alwaysShow: true })

		render(
			<Wrapper instance={instance}>
				<ClearFiltersButton />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /clear filters/i })).toBeDisabled()
	})

	it('click clears column filters and global filter', async () => {
		const user = userEvent.setup()
		const { instance } = makeTable()
		instance.table.setColumnFilters([{ id: 'name', value: 'al' }])
		instance.table.setGlobalFilter('hello')

		render(
			<Wrapper instance={instance}>
				<ClearFiltersButton />
			</Wrapper>,
		)
		await user.click(screen.getByRole('button', { name: /clear filters/i }))
		expect(instance.table.getState().columnFilters).toEqual([])
		expect(instance.table.getState().globalFilter).toBeUndefined()
	})

	it('renders custom children when provided', () => {
		const { instance } = makeTable()
		instance.table.setGlobalFilter('al')

		render(
			<Wrapper instance={instance}>
				<ClearFiltersButton>Reset filters</ClearFiltersButton>
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument()
	})
})

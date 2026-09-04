import { createTable, createColumns } from '@ez-kit/data-grid-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { prepareDataGridTable } from '../prepare-table'
import { testComponents } from '../test-utils'

import { ColumnFilter } from './column-filter'
import { TableContext } from './table-context'

import type { DataTable } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

type Row = {
	id: number
	name: string
	role: 'admin' | 'member'
}

const DATA: Row[] = [
	{ id: 1, name: 'Alice', role: 'admin' },
	{ id: 2, name: 'Bob', role: 'member' },
]

const COLUMNS = createColumns<Row>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'role',
		header: 'Role',
		cell: {
			type: 'select',
			config: {
				items: [
					{ value: 'admin', label: 'Admin' },
					{ value: 'member', label: 'Member' },
				],
			},
		},
	},
])

function makeTable(config?: Partial<Parameters<typeof createTable<Row>>[0]>) {
	return prepareDataGridTable(createTable<Row>({ data: DATA, columns: COLUMNS, filtering: true, ...config }))
}

function Wrapper({ table, children }: { table: DataTable<Row>; children: ReactNode }) {
	return (
		<GridComponentsProvider components={testComponents}>
			<TableContext value={table}>{children}</TableContext>
		</GridComponentsProvider>
	)
}

describe('<ColumnFilter>', () => {
	it('renders the named column and nothing else', () => {
		const { container } = render(
			<Wrapper table={makeTable()}>
				<ColumnFilter columnId='role' />
			</Wrapper>,
		)

		const chips = container.querySelectorAll('[data-slot="filter-panel-chip"]')
		expect(chips).toHaveLength(1)
		expect(chips[0]?.textContent).toContain('Role')
	})

	it('shows the column value the way the panel does', () => {
		const table = makeTable()
		table.getColumn('role')?.setFilterValue(['admin'])
		const { container } = render(
			<Wrapper table={table}>
				<ColumnFilter columnId='role' />
			</Wrapper>,
		)

		expect(container.querySelector('[data-slot="filter-panel-chip-value"]')?.textContent).toBe('Admin')
	})

	// The panel keeps quiet in these states too, so neither needs a guard around it.
	it('renders nothing for an unknown column', () => {
		const { container } = render(
			<Wrapper table={makeTable()}>
				<ColumnFilter columnId='nope' />
			</Wrapper>,
		)

		expect(container).toBeEmptyDOMElement()
	})

	it('renders nothing when the grid does not filter', () => {
		const { container } = render(
			<Wrapper table={makeTable({ filtering: false })}>
				<ColumnFilter columnId='role' />
			</Wrapper>,
		)

		expect(container).toBeEmptyDOMElement()
	})

	it('hands the resolved column to a render function', () => {
		render(
			<Wrapper table={makeTable()}>
				<ColumnFilter columnId='role'>
					{({ label, input }) => (
						<label>
							{label}::render{input}
						</label>
					)}
				</ColumnFilter>
			</Wrapper>,
		)

		expect(screen.getByText(/Role::render/)).toBeDefined()
	})
})

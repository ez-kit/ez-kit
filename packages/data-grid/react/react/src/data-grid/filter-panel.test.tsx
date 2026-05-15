import { createTable, defineColumns } from '@ez-kit/data-grid-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { createDataGridInstance } from '../data-grid-instance'
import { testComponents } from '../test-utils'

import { FilterPanel } from './filter-panel'
import { TableContext } from './table-context'

import type { DataGridInstance } from '../data-grid-instance'
import type { ReactNode } from 'react'

type Row = {
	id: number
	name: string
	age: number
	role: 'admin' | 'member'
}

const DATA: Row[] = [
	{ id: 1, name: 'Alice', age: 30, role: 'admin' },
	{ id: 2, name: 'Bob', age: 22, role: 'member' },
]

const COLUMNS = defineColumns<Row>([
	{ accessorKey: 'name', header: 'Name', filtering: { operators: true } },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' }, filtering: { operators: true } },
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
		filtering: { operators: true },
	},
])

function makeTable(config?: Partial<Parameters<typeof createTable<Row>>[0]>) {
	const table = createTable<Row>({ data: DATA, columns: COLUMNS, filtering: true, ...config })
	return { table, instance: createDataGridInstance(table) }
}

function Wrapper({ instance, children }: { instance: DataGridInstance<Row>; children: ReactNode }) {
	return (
		<GridComponentsProvider components={testComponents}>
			<TableContext value={instance}>{children}</TableContext>
		</GridComponentsProvider>
	)
}

describe('<FilterPanel>', () => {
	it('renders one chip per filterable column with column header as label', () => {
		const { instance } = makeTable()
		const { container } = render(
			<Wrapper instance={instance}>
				<FilterPanel />
			</Wrapper>,
		)

		const chips = container.querySelectorAll('[data-slot="filter-panel-chip"]')
		expect(chips).toHaveLength(3)

		expect(chips[0]?.textContent).toContain('Name:')
		expect(chips[1]?.textContent).toContain('Age:')
		expect(chips[2]?.textContent).toContain('Role:')
	})

	it('shows "Any" for the value when the filter is empty', () => {
		const { instance } = makeTable()
		const { container } = render(
			<Wrapper instance={instance}>
				<FilterPanel />
			</Wrapper>,
		)
		const valueSlots = container.querySelectorAll('[data-slot="filter-panel-chip-value"]')
		expect(valueSlots).toHaveLength(3)
		for (const slot of valueSlots) {
			expect(slot.textContent).toBe('Any')
		}
	})

	it('shows the typed value for an active text contains filter', () => {
		const { instance } = makeTable()
		instance.table.getColumn('name')?.setFilterValue({ operator: 'contains', value: 'al' })
		const { container } = render(
			<Wrapper instance={instance}>
				<FilterPanel />
			</Wrapper>,
		)
		const valueSlots = Array.from(container.querySelectorAll('[data-slot="filter-panel-chip-value"]'))
		expect(valueSlots[0]?.textContent).toBe('al')
	})

	it('formats a between value as "from – to"', () => {
		const { instance } = makeTable()
		instance.table.getColumn('age')?.setFilterValue({ operator: 'between', value: { from: 18, to: 30 } })
		const { container } = render(
			<Wrapper instance={instance}>
				<FilterPanel />
			</Wrapper>,
		)
		const valueSlots = Array.from(container.querySelectorAll('[data-slot="filter-panel-chip-value"]'))
		expect(valueSlots[1]?.textContent).toBe('18 – 30')
	})

	it('formats one-sided between as "≥ from" or "≤ to"', () => {
		const { instance } = makeTable()
		instance.table.getColumn('age')?.setFilterValue({ operator: 'between', value: { from: 21, to: undefined } })
		const { container } = render(
			<Wrapper instance={instance}>
				<FilterPanel />
			</Wrapper>,
		)
		const valueSlots = Array.from(container.querySelectorAll('[data-slot="filter-panel-chip-value"]'))
		expect(valueSlots[1]?.textContent).toBe('≥ 21')
	})

	it('formats multi-value (in) filter using option labels', () => {
		const { instance } = makeTable()
		instance.table.getColumn('role')?.setFilterValue({ operator: 'in', value: ['admin', 'member'] })
		const { container } = render(
			<Wrapper instance={instance}>
				<FilterPanel />
			</Wrapper>,
		)
		const valueSlots = Array.from(container.querySelectorAll('[data-slot="filter-panel-chip-value"]'))
		expect(valueSlots[2]?.textContent).toBe('Admin, Member')
	})

	it('truncates multi-value display when more than two values', () => {
		const COLUMNS_WITH_MANY = defineColumns<Row>([
			{
				accessorKey: 'role',
				header: 'Role',
				cell: {
					type: 'select',
					config: {
						items: [
							{ value: 'a', label: 'A' },
							{ value: 'b', label: 'B' },
							{ value: 'c', label: 'C' },
							{ value: 'd', label: 'D' },
						],
					},
				},
				filtering: { operators: true },
			},
		])
		const table = createTable<Row>({ data: DATA, columns: COLUMNS_WITH_MANY, filtering: true })
		const instance = createDataGridInstance(table)
		instance.table.getColumn('role')?.setFilterValue({ operator: 'in', value: ['a', 'b', 'c', 'd'] })

		const { container } = render(
			<Wrapper instance={instance}>
				<FilterPanel />
			</Wrapper>,
		)
		const valueSlot = container.querySelector('[data-slot="filter-panel-chip-value"]')
		expect(valueSlot?.textContent).toBe('A, B +2')
	})

	it('formats requiresInput=false operators using the operator label', () => {
		const { instance } = makeTable()
		instance.table.getColumn('name')?.setFilterValue({ operator: 'isEmpty', value: undefined })

		const { container } = render(
			<Wrapper instance={instance}>
				<FilterPanel />
			</Wrapper>,
		)
		const valueSlots = Array.from(container.querySelectorAll('[data-slot="filter-panel-chip-value"]'))
		expect(valueSlots[0]?.textContent).toBe('Is empty')
	})

	it('passes onClear that resets the filter on the column', () => {
		const { instance } = makeTable()
		instance.table.getColumn('name')?.setFilterValue({ operator: 'contains', value: 'al' })

		render(
			<Wrapper instance={instance}>
				<FilterPanel />
			</Wrapper>,
		)
		const clearBtn = screen.getByRole('button', { name: 'Clear Name filter' })
		fireEvent.click(clearBtn)

		expect(instance.table.getColumn('name')?.getFilterValue()).toBeUndefined()
	})

	it('passes hasActiveFilter=true to the chrome when at least one filter is active', () => {
		const { instance } = makeTable()
		instance.table.getColumn('name')?.setFilterValue({ operator: 'contains', value: 'a' })

		const { container } = render(
			<Wrapper instance={instance}>
				<FilterPanel />
			</Wrapper>,
		)
		const chrome = container.querySelector('[data-slot="filter-panel-chrome"]')
		expect(chrome?.getAttribute('data-has-active')).toBe('true')
	})

	it('returns null when filtering is disabled at the table level', () => {
		const table = createTable<Row>({ data: DATA, columns: COLUMNS })
		const instance = createDataGridInstance(table)
		const { container } = render(
			<Wrapper instance={instance}>
				<FilterPanel />
			</Wrapper>,
		)
		expect(container.querySelector('[data-slot="filter-panel"]')).toBeNull()
	})
})

import { createTable, createColumns } from '@ez-kit/data-grid-core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { prepareDataGridTable } from '../prepare-table'
import { testComponents } from '../test-utils'

import { SelectionBar } from './selection-bar'
import { TableContext } from './table-context'

import type { ResolvedGridOptions } from '../resolved-options'
import type { DataTable } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

type User = {
	id: number
	name: string
}

const USERS: User[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const COLUMNS = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])

function makeTable(config?: Partial<Parameters<typeof createTable<User>>[0]>) {
	const table = createTable<User>({ data: USERS, columns: COLUMNS, ...config })
	return prepareDataGridTable(table)
}

function setSelectionBarKey(table: DataTable<User>, value: ResolvedGridOptions['selection']['bar']) {
	table.grid.selection.bar = value
}

function Wrapper({ table, children }: { table: DataTable<User>; children: ReactNode }) {
	return (
		<GridComponentsProvider components={testComponents}>
			<TableContext value={table}>{children}</TableContext>
		</GridComponentsProvider>
	)
}

describe('<SelectionBar>', () => {
	it('renders nothing when selection is not enabled', () => {
		const table = makeTable()
		setSelectionBarKey(table, undefined)

		const { container } = render(
			<Wrapper table={table}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(container.firstChild).toBeNull()
	})

	it('renders nothing when selection.bar: false even with selection enabled', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, false)

		const { container } = render(
			<Wrapper table={table}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(container.firstChild).toBeNull()
	})

	it('renders bar (closed) when selection enabled and no rows selected', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, true)

		render(
			<Wrapper table={table}>
				<SelectionBar />
			</Wrapper>,
		)
		// DefaultSelectionBar returns null when !open (0 rows selected)
		expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
	})

	it('renders bar with count when rows are selected', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, true)
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('toolbar')).toBeInTheDocument()
		expect(screen.getByText(/1 selected/i)).toBeInTheDocument()
	})

	it('does NOT render Delete button when onDelete is not configured', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, true)
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
	})

	it('renders Delete button when deleting.bulk is enabled', () => {
		const table = makeTable({ selection: true, deleting: { onDelete: () => {}, bulk: { onDelete: vi.fn() } } })
		setSelectionBarKey(table, true)
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
	})

	it('runs the bulk handler with the selection when Delete is clicked', async () => {
		const user = userEvent.setup()
		const onDelete = vi.fn()
		const table = makeTable({ selection: true, deleting: { onDelete: () => {}, bulk: { onDelete } } })
		setSelectionBarKey(table, true)
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<SelectionBar />
			</Wrapper>,
		)
		await user.click(screen.getByRole('button', { name: /delete/i }))
		expect(onDelete).toHaveBeenCalledOnce()
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const args = onDelete.mock.calls.at(0)?.at(0)
		expect(args).toHaveProperty('rowIds')
		expect(args).toHaveProperty('rows')
		expect(args).toHaveProperty('signal')
		expect((args as { rows: unknown[] }).rows).toHaveLength(1)
	})

	it('Cancel button calls table.resetRowSelection when onClear not configured', async () => {
		const user = userEvent.setup()
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, true)
		table.setRowSelection({ '1': true })

		const resetSpy = vi.spyOn(table, 'resetRowSelection')

		render(
			<Wrapper table={table}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('toolbar')).toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: /cancel/i }))
		expect(resetSpy).toHaveBeenCalledOnce()
	})

	it('calls custom onClear when configured', async () => {
		const user = userEvent.setup()
		const onClear = vi.fn()
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, { onClear })
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<SelectionBar />
			</Wrapper>,
		)
		await user.click(screen.getByRole('button', { name: /cancel/i }))
		expect(onClear).toHaveBeenCalledOnce()
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const args = onClear.mock.calls.at(0)?.at(0)
		expect(args).toHaveProperty('clearSelection')
	})

	it('renders ReactElement actions when provided', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, {
			actions: <button type='button'>Export</button>,
		})
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
	})

	it('renders function actions when provided', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, {
			actions: () => <button type='button'>Export</button>,
		})
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
	})

	it('passes variant="floating" by default to DI component', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, true)
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('toolbar')).toHaveAttribute('data-variant', 'floating')
	})

	it('passes variant="inline" when configured', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, { variant: 'inline' })
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('toolbar')).toHaveAttribute('data-variant', 'inline')
	})
})

import { createTable, defineColumns } from '@ez-kit/data-grid-core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { createDataGridInstance } from '../data-grid-instance'
import { testComponents } from '../test-utils'
import { SELECTION_PANEL_KEY } from '../use-data-grid'

import { SelectionBar } from './selection-bar'
import { TableContext } from './table-context'

import type { DataGridInstance } from '../data-grid-instance'
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
const COLUMNS = defineColumns<User>([{ accessorKey: 'name', header: 'Name' }])

function makeTable(config?: Partial<Parameters<typeof createTable<User>>[0]>) {
	const table = createTable<User>({ data: USERS, columns: COLUMNS, ...config })
	return { table, instance: createDataGridInstance(table) }
}

function setSelectionPanelKey(table: DataTable<User>, value: unknown) {
	;(table as unknown as Record<symbol, unknown>)[SELECTION_PANEL_KEY] = value
}

function Wrapper({ instance, children }: { instance: DataGridInstance<User>; children: ReactNode }) {
	return (
		<GridComponentsProvider components={testComponents}>
			<TableContext value={instance}>{children}</TableContext>
		</GridComponentsProvider>
	)
}

describe('<SelectionBar>', () => {
	it('renders nothing when selection is not enabled', () => {
		const { instance } = makeTable()
		setSelectionPanelKey(instance.table, undefined)

		const { container } = render(
			<Wrapper instance={instance}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(container.firstChild).toBeNull()
	})

	it('renders nothing when selection.panel: false even with selection enabled', () => {
		const { instance } = makeTable({ selection: true })
		setSelectionPanelKey(instance.table, false)

		const { container } = render(
			<Wrapper instance={instance}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(container.firstChild).toBeNull()
	})

	it('renders bar (closed) when selection enabled and no rows selected', () => {
		const { instance } = makeTable({ selection: true })
		setSelectionPanelKey(instance.table, true)

		render(
			<Wrapper instance={instance}>
				<SelectionBar />
			</Wrapper>,
		)
		// DefaultSelectionBar returns null when !open (0 rows selected)
		expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
	})

	it('renders bar with count when rows are selected', () => {
		const { instance } = makeTable({ selection: true })
		setSelectionPanelKey(instance.table, true)
		instance.table.setRowSelection({ '1': true })

		render(
			<Wrapper instance={instance}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('toolbar')).toBeInTheDocument()
		expect(screen.getByText(/1 selected/i)).toBeInTheDocument()
	})

	it('does NOT render Delete button when onDelete is not configured', () => {
		const { instance } = makeTable({ selection: true })
		setSelectionPanelKey(instance.table, true)
		instance.table.setRowSelection({ '1': true })

		render(
			<Wrapper instance={instance}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
	})

	it('renders Delete button when onDelete is configured', () => {
		const onDelete = vi.fn()
		const { instance } = makeTable({ selection: true })
		setSelectionPanelKey(instance.table, { onDelete })
		instance.table.setRowSelection({ '1': true })

		render(
			<Wrapper instance={instance}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
	})

	it('calls onDelete with correct args when Delete button is clicked', async () => {
		const user = userEvent.setup()
		const onDelete = vi.fn()
		const { instance } = makeTable({ selection: true })
		setSelectionPanelKey(instance.table, { onDelete })
		instance.table.setRowSelection({ '1': true })

		render(
			<Wrapper instance={instance}>
				<SelectionBar />
			</Wrapper>,
		)
		await user.click(screen.getByRole('button', { name: /delete/i }))
		expect(onDelete).toHaveBeenCalledOnce()
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const args = onDelete.mock.calls.at(0)?.at(0)
		expect(args).toHaveProperty('table')
		expect(args).toHaveProperty('clearSelection')
		expect(args).toHaveProperty('selectedRows')
		expect((args as { selectedRows: unknown[] }).selectedRows).toHaveLength(1)
	})

	it('Cancel button calls instance.table.resetRowSelection when onClear not configured', async () => {
		const user = userEvent.setup()
		const { instance } = makeTable({ selection: true })
		setSelectionPanelKey(instance.table, true)
		instance.table.setRowSelection({ '1': true })

		const resetSpy = vi.spyOn(instance.table, 'resetRowSelection')

		render(
			<Wrapper instance={instance}>
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
		const { instance } = makeTable({ selection: true })
		setSelectionPanelKey(instance.table, { onClear })
		instance.table.setRowSelection({ '1': true })

		render(
			<Wrapper instance={instance}>
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
		const { instance } = makeTable({ selection: true })
		setSelectionPanelKey(instance.table, {
			actions: <button type='button'>Export</button>,
		})
		instance.table.setRowSelection({ '1': true })

		render(
			<Wrapper instance={instance}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
	})

	it('renders function actions when provided', () => {
		const { instance } = makeTable({ selection: true })
		setSelectionPanelKey(instance.table, {
			actions: () => <button type='button'>Export</button>,
		})
		instance.table.setRowSelection({ '1': true })

		render(
			<Wrapper instance={instance}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
	})

	it('passes variant="floating" by default to DI component', () => {
		const { instance } = makeTable({ selection: true })
		setSelectionPanelKey(instance.table, true)
		instance.table.setRowSelection({ '1': true })

		render(
			<Wrapper instance={instance}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('toolbar')).toHaveAttribute('data-variant', 'floating')
	})

	it('passes variant="inline" when configured', () => {
		const { instance } = makeTable({ selection: true })
		setSelectionPanelKey(instance.table, { variant: 'inline' })
		instance.table.setRowSelection({ '1': true })

		render(
			<Wrapper instance={instance}>
				<SelectionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('toolbar')).toHaveAttribute('data-variant', 'inline')
	})
})

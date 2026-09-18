import { createTable, createColumns } from '@ez-kit/data-grid-core'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { prepareDataGridTable } from '../prepare-table'
import { renderGrid, TEST_FEATURES, testComponents } from '../test-utils'
import { ActionBarVariant } from '../types'

import { ActionBar } from './action-bar'
import { TableProvider } from './table-context'

import type { ResolvedGridOptions } from '../resolved-options'
import type { DataTable, GridFeatures } from '../types'
import type { ReactNode } from 'react'

const ACTION_BAR = "[data-slot='action-bar']"
const SELECTION_SECTION = "[data-slot='action-bar-selection']"
const DRAFT_SECTION = "[data-slot='action-bar-draft']"

type User = {
	id: number
	name: string
}

const USERS: User[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const COLUMNS = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])

function makeTable(config?: Partial<Parameters<typeof createTable<GridFeatures, User>>[0]>) {
	const table = createTable<GridFeatures, User>({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, ...config })
	return prepareDataGridTable(table)
}

function setSelectionBarKey(table: DataTable<GridFeatures, User>, value: ResolvedGridOptions['selection']['bar']) {
	table.grid.selection.bar = value
}

function Wrapper({ table, children }: { table: DataTable<GridFeatures, User>; children: ReactNode }) {
	return (
		<GridComponentsProvider components={testComponents}>
			<TableProvider table={table}>{children}</TableProvider>
		</GridComponentsProvider>
	)
}

/**
 * The regression this change exists for.
 *
 * Two independent components each drew a whole bar, kept apart by a `return null` in
 * `SelectionBar` that only ran when `rowSelection` changed. A draft edit changes no
 * `rowSelection`, so the gate never re-ran and both bars mounted at the same sticky
 * position — measured on `/examples/shadcn/production-deferred-apply`.
 *
 * These cases name the *target* slots, so against the old code they failed on "0 elements
 * found" rather than on the overlap: they encode the destination, not the symptom.
 */
describe('<ActionBar> — one bar, two live sections', () => {
	it('renders exactly one bar carrying both sections when a draft is pending over a selection', async () => {
		const { container, table } = renderGrid({
			draft: true,
			sorting: { manual: true },
			selection: true,
		})
		table.setRowSelection({ '1': true, '2': true })

		table.setSorting([{ id: 'age', desc: true }])

		await screen.findByTestId('action-bar')
		const bars = container.querySelectorAll(ACTION_BAR)
		expect(bars).toHaveLength(1)

		const bar = bars[0]
		expect(bar?.querySelector(SELECTION_SECTION)).not.toBeNull()
		expect(bar?.querySelector(DRAFT_SECTION)).not.toBeNull()
	})

	/**
	 * The behaviour change, not just the DOM change. The selection is valid against the
	 * **applied** query — the one the user is looking at — so bulk actions stay live while a
	 * draft is pending. The set only goes stale after Apply, and `table.draft.apply()` already
	 * clears the selection in the same state change.
	 */
	it('keeps the bulk Delete live while the draft is pending', async () => {
		const user = userEvent.setup()
		const onDelete = vi.fn()
		const { table } = renderGrid({
			draft: true,
			sorting: { manual: true },
			selection: true,
			deleting: { onDelete: () => {}, bulk: { onDelete } },
		})
		table.setRowSelection({ '1': true, '2': true })

		table.setSorting([{ id: 'age', desc: true }])

		// Scoped to the bar: `deleting` also gives every row its own Delete.
		const bar = await screen.findByTestId('action-bar')
		const deleteButton = within(bar).getByRole('button', { name: /delete/i })
		expect(deleteButton).toBeEnabled()

		await user.click(deleteButton)
		expect(onDelete).toHaveBeenCalledOnce()
	})

	it('renders the selection section alone when the grid has no draft', async () => {
		const { container, table } = renderGrid({ selection: true })
		table.setRowSelection({ '1': true })

		await screen.findByTestId('action-bar')
		expect(container.querySelector(SELECTION_SECTION)).not.toBeNull()
		expect(container.querySelector(DRAFT_SECTION)).toBeNull()
	})

	it('renders the draft section alone when nothing is selected', async () => {
		const { container, table } = renderGrid({ draft: true, sorting: { manual: true } })

		table.setSorting([{ id: 'age', desc: true }])

		await screen.findByTestId('action-bar')
		expect(container.querySelector(DRAFT_SECTION)).not.toBeNull()
		expect(container.querySelector(SELECTION_SECTION)).toBeNull()
	})

	it('renders no bar content when neither section has anything to show', () => {
		const { container } = renderGrid({ draft: true, sorting: { manual: true }, selection: true })

		// Selection on, so the section exists — but nothing is selected and the draft is clean,
		// so `open` is false and the kit's bar renders nothing.
		expect(container.querySelector(ACTION_BAR)).toBeNull()
	})
})

describe('<ActionBar> — the selection section', () => {
	it('renders nothing when selection is not enabled', () => {
		const table = makeTable()
		setSelectionBarKey(table, undefined)

		const { container } = render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		expect(container.firstChild).toBeNull()
	})

	it('renders nothing when selection.bar: false even with selection enabled', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, undefined)

		const { container } = render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		expect(container.firstChild).toBeNull()
	})

	it('renders the bar closed when selection is enabled and no rows are selected', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, { variant: ActionBarVariant.Floating })

		render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		// The test kit unmounts when `open` is false; a kit that animates out would keep the
		// element and read `data-state="closed"` instead.
		expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
	})

	it('renders the count when rows are selected', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, { variant: ActionBarVariant.Floating })
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('toolbar')).toBeInTheDocument()
		expect(screen.getByText(/1 selected/i)).toBeInTheDocument()
	})

	it('does NOT render a Delete button when deleting.bulk is not configured', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, { variant: ActionBarVariant.Floating })
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
	})

	it('renders a Delete button when deleting.bulk is enabled', () => {
		const table = makeTable({ selection: true, deleting: { onDelete: () => {}, bulk: { onDelete: vi.fn() } } })
		setSelectionBarKey(table, { variant: ActionBarVariant.Floating })
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
	})

	it('runs the bulk handler with the selection when Delete is clicked', async () => {
		const user = userEvent.setup()
		const onDelete = vi.fn()
		const table = makeTable({ selection: true, deleting: { onDelete: () => {}, bulk: { onDelete } } })
		setSelectionBarKey(table, { variant: ActionBarVariant.Floating })
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<ActionBar />
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

	/**
	 * `onDelete` encodes the confirmation protocol rather than exposing the configured handler:
	 * with `deleting.bulk.confirmation` set it stages a pending bulk delete and the shared
	 * `ConfirmDialog` runs the handler on confirm. A bar that reached for the handler itself
	 * would silently skip the prompt.
	 */
	it('stages a pending bulk delete instead of running the handler when confirmation is on', async () => {
		const user = userEvent.setup()
		const onDelete = vi.fn()
		const table = makeTable({
			selection: true,
			deleting: { onDelete: () => {}, bulk: { onDelete, confirmation: true } },
		})
		setSelectionBarKey(table, { variant: ActionBarVariant.Floating })
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		await user.click(screen.getByRole('button', { name: /delete/i }))

		expect(onDelete).not.toHaveBeenCalled()
		expect(table.store.state.deleting.pendingBulk).toBe(true)
	})

	it('Cancel calls table.resetRowSelection when onClear is not configured', async () => {
		const user = userEvent.setup()
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, { variant: ActionBarVariant.Floating })
		table.setRowSelection({ '1': true })

		const resetSpy = vi.spyOn(table, 'resetRowSelection')

		render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('toolbar')).toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: /cancel/i }))
		expect(resetSpy).toHaveBeenCalledOnce()
	})

	it('clears the selection and notifies onClear with the rows it held', async () => {
		const user = userEvent.setup()
		const onClear = vi.fn()
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, { variant: ActionBarVariant.Floating, onClear })
		table.setRowSelection({ '1': true })

		const resetSpy = vi.spyOn(table, 'resetRowSelection')

		render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		await user.click(screen.getByRole('button', { name: /cancel/i }))
		// The grid clears on its own — the handler is never asked to finish the job.
		expect(resetSpy).toHaveBeenCalledOnce()
		expect(onClear).toHaveBeenCalledOnce()
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const args = onClear.mock.calls.at(0)?.at(0)
		expect(args).toHaveProperty('clearSelection')
		// The set as it stood before the reset — the reason to prefer this over selection.onChange.
		expect((args as { selectedRows: unknown[] }).selectedRows).toHaveLength(1)
	})

	it('renders the actions the config builds, with the selection in scope', async () => {
		const user = userEvent.setup()
		const onExport = vi.fn()
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, {
			variant: ActionBarVariant.Floating,
			actions: ({ selectedRows }) => [
				{ id: 'export', label: `Export ${String(selectedRows.length)}`, onAction: onExport },
			],
		})
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		await user.click(screen.getByRole('button', { name: 'Export 1' }))
		expect(onExport).toHaveBeenCalledOnce()
	})

	it('renders an entry that brought its own component instead of a kit button', async () => {
		const user = userEvent.setup()
		const onExport = vi.fn()
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, {
			variant: ActionBarVariant.Floating,
			actions: ({ selectedRows }) => [
				{
					id: 'export',
					component: (
						<button
							type='button'
							onClick={() => {
								onExport(selectedRows.length)
							}}
						>
							Export mine
						</button>
					),
				},
			],
		})
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		const button = screen.getByRole('button', { name: 'Export mine' })
		// The kit wrapped nothing around it: no action-slot button was drawn for this entry.
		expect(button).not.toHaveAttribute('data-slot', 'action-bar-action')
		await user.click(button)
		expect(onExport).toHaveBeenCalledWith(1)
	})

	it('carries an entry’s destructive and disabled flags through to the kit', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, {
			variant: ActionBarVariant.Floating,
			actions: () => [{ id: 'purge', label: 'Purge', destructive: true, disabled: true, onAction: () => {} }],
		})
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		const button = screen.getByRole('button', { name: 'Purge' })
		expect(button).toBeDisabled()
		expect(button).toHaveAttribute('data-destructive')
	})

	it('renders no action buttons when the callback returns an empty list', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, { variant: ActionBarVariant.Floating, actions: () => [] })
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		expect(screen.getByTestId('action-bar').querySelectorAll("[data-slot='action-bar-action']")).toHaveLength(0)
	})

	it('renders the start and end slots around the kit’s own controls', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, { variant: ActionBarVariant.Floating })
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<ActionBar
					start={<span data-testid='bar-start'>start</span>}
					end={<span data-testid='bar-end'>end</span>}
				/>
			</Wrapper>,
		)
		// They feed the **selection section**, not the bar's two ends.
		const section = screen.getByTestId('action-bar').querySelector(SELECTION_SECTION)
		expect(section).not.toBeNull()
		expect(within(section as HTMLElement).getByTestId('bar-start')).toBeInTheDocument()
		expect(within(section as HTMLElement).getByTestId('bar-end')).toBeInTheDocument()
	})
})

describe('<ActionBar> — the draft section', () => {
	it('is closed when nothing is pending', () => {
		renderGrid({ draft: true, sorting: { manual: true } })

		expect(screen.queryByTestId('action-bar')).toBeNull()
	})

	it('opens with the pending counts once a sort is drafted', async () => {
		const { table } = renderGrid({ draft: true, sorting: { manual: true } })

		table.setSorting([{ id: 'age', desc: true }])

		expect(await screen.findByTestId('action-bar')).toBeInTheDocument()
		expect(screen.getByTestId('action-bar')).toHaveAttribute('data-pending-sorting', '1')
	})

	it('applies the draft when Apply is pressed', async () => {
		const { table } = renderGrid({ draft: true, sorting: { manual: true } })
		table.setSorting([{ id: 'age', desc: true }])

		await userEvent.click(await screen.findByRole('button', { name: /apply/i }))

		expect(table.draft.isDirty()).toBe(false)
	})

	it('restores the applied query when Reset is pressed', async () => {
		const { table } = renderGrid({ draft: true, sorting: { manual: true } })
		table.setSorting([{ id: 'age', desc: true }])

		await userEvent.click(await screen.findByRole('button', { name: /reset/i }))

		expect(table.store.state.sorting).toEqual([])
	})
})

/**
 * One bar means one variant. It was two components reading one helper to keep a knob equal;
 * now there is one element to carry it.
 */
describe('<ActionBar> — the variant', () => {
	it('renders floating by default', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, { variant: ActionBarVariant.Floating })
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('toolbar')).toHaveAttribute('data-variant', 'floating')
	})

	it('renders inline when configured', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, { variant: 'inline' })
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<ActionBar />
			</Wrapper>,
		)
		expect(screen.getByRole('toolbar')).toHaveAttribute('data-variant', 'inline')
	})

	it('keeps the configured variant once the draft section joins the bar', async () => {
		const { table } = renderGrid({
			draft: true,
			sorting: { manual: true },
			selection: { bar: { variant: 'inline' } },
		})
		table.setRowSelection({ '1': true })

		expect(await screen.findByTestId('action-bar')).toHaveAttribute('data-variant', 'inline')

		table.setSorting([{ id: 'age', desc: true }])

		expect(await screen.findByTestId('action-bar')).toHaveAttribute('data-variant', 'inline')
	})

	it('falls back to floating for a draft-only grid, which has no selection.bar to read', async () => {
		const { table } = renderGrid({ draft: true, sorting: { manual: true }, selection: true })

		table.setSorting([{ id: 'age', desc: true }])

		expect(await screen.findByTestId('action-bar')).toHaveAttribute('data-variant', 'floating')
	})
})

describe('<ActionBar> — the render function', () => {
	it('hands both sections to a custom bar', async () => {
		const { table } = renderGrid(
			{ draft: true, sorting: { manual: true }, selection: true },
			<ActionBar>
				{({ open, selection, draft }) => (
					<div data-testid='custom-bar'>
						<span data-testid='custom-open'>{String(open)}</span>
						<span data-testid='custom-count'>{selection?.count ?? 'none'}</span>
						<span data-testid='custom-pending'>{draft?.pending.sorting ?? 'none'}</span>
					</div>
				)}
			</ActionBar>,
		)
		table.setRowSelection({ '1': true })

		table.setSorting([{ id: 'age', desc: true }])

		await screen.findByTestId('custom-bar')
		expect(screen.getByTestId('custom-open')).toHaveTextContent('true')
		expect(screen.getByTestId('custom-count')).toHaveTextContent('1')
		expect(screen.getByTestId('custom-pending')).toHaveTextContent('1')
	})

	it('renders plain children in place of the kit bar', () => {
		const table = makeTable({ selection: true })
		setSelectionBarKey(table, { variant: ActionBarVariant.Floating })
		table.setRowSelection({ '1': true })

		render(
			<Wrapper table={table}>
				<ActionBar>
					<span data-testid='plain-children'>mine</span>
				</ActionBar>
			</Wrapper>,
		)
		expect(screen.getByTestId('plain-children')).toBeInTheDocument()
		expect(screen.queryByTestId('action-bar')).toBeNull()
	})
})

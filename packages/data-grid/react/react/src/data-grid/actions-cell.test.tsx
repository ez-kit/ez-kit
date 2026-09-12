import { createColumns, RowActionsPlacement } from '@ez-kit/data-grid-core'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { renderWithComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { UseDataGridConfig } from '../use-data-grid'
import type { RowActionsConfig } from '@ez-kit/data-grid-core'

// JSDOM lacks ResizeObserver; the table layout effect needs one.
beforeAll(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class StubResizeObserver {
			observe(): void {}
			unobserve(): void {}
			disconnect(): void {}
		},
	)
})

type Row = { id: number; name: string }
const DATA: Row[] = [{ id: 1, name: 'Alice' }]
const COLUMNS = createColumns<Row>([{ accessorKey: 'name' }])

const EDIT_DELETE = {
	editing: { mode: 'row', onSave: () => Promise.resolve() },
	deleting: { onDelete: () => {} },
} satisfies Partial<UseDataGridConfig<Row>>

function renderGrid(config: Partial<UseDataGridConfig<Row>>) {
	function Harness() {
		const table = useDataGrid<Row>({ data: DATA, columns: COLUMNS, ...config })
		return <DataGrid<Row> table={table} />
	}
	return renderWithComponents(<Harness />)
}

/** The test kit renders every menu item as a plain button labelled by its `label`. */
const actionLabels = () => screen.getAllByRole('button').map((b) => b.textContent)

describe('<ActionsCell> — row actions column', () => {
	it('renders edit, delete and the pin actions in one column', () => {
		renderGrid({ ...EDIT_DELETE, pinning: { row: { top: true, bottom: true } } })

		const labels = actionLabels()
		expect(labels).toEqual(expect.arrayContaining(['Edit', 'Delete', 'Pin Top', 'Pin Bottom']))
	})

	it('injects the actions column when only row pinning is enabled', () => {
		renderGrid({ pinning: { row: { top: true } } })

		expect(actionLabels()).toEqual(expect.arrayContaining(['Pin Top']))
		expect(document.querySelector(`[data-system-column='actions']`)).not.toBeNull()
	})

	it('offers Unpin once the row is pinned', async () => {
		renderGrid({ pinning: { row: { top: true } } })

		await userEvent.click(screen.getByRole('button', { name: 'Pin Top' }))

		expect(screen.getByRole('button', { name: 'Unpin' })).toBeTruthy()
	})

	it('menu placement routes edit and delete through the menu too', () => {
		renderGrid({
			...EDIT_DELETE,
			pinning: { row: { top: true } },
			rowActions: { placement: RowActionsPlacement.Menu },
		})

		// Same actions, but produced by RowActionsMenu rather than the inline buttons.
		expect(actionLabels()).toEqual(expect.arrayContaining(['Edit', 'Delete', 'Pin Top']))
	})

	it('menu placement keeps save / cancel inline while a row is being edited', async () => {
		renderGrid({ ...EDIT_DELETE, rowActions: { placement: RowActionsPlacement.Menu } })

		await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

		expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
	})
	/**
	 * Cell editing is opened by double-clicking the cell and committed on blur / Enter, so the
	 * pencil here had nothing to open: it called `editing.start(rowId)` — the row flow — which in
	 * this mode changed no cell, only swapped this column for a Save / Cancel pair that commits a
	 * form nobody filled in.
	 */
	it('omits Edit in cell mode while keeping the column another feature asked for', () => {
		renderGrid({
			editing: { mode: 'cell', onSave: () => Promise.resolve() },
			deleting: { onDelete: () => {} },
		})

		const labels = actionLabels()
		expect(labels).toEqual(expect.arrayContaining(['Delete']))
		expect(labels).not.toContain('Edit')
	})

	it('keeps the actions column out of a cell-mode grid that asked for nothing else', () => {
		renderGrid({ editing: { mode: 'cell', onSave: () => Promise.resolve() } })

		expect(document.querySelector(`[data-system-column='actions']`)).toBeNull()
	})

	it('does not swap in save / cancel while a cell edit is open', async () => {
		renderGrid({
			editing: { mode: 'cell', onSave: () => Promise.resolve() },
			deleting: { onDelete: () => {} },
		})

		await userEvent.dblClick(screen.getByText('Alice'))

		expect(screen.getByDisplayValue('Alice')).toBeTruthy()
		expect(actionLabels()).not.toContain('Save')
	})
})

describe('<ActionsCell> — custom actions', () => {
	// `row.original` is typed: `TableConfig<TRow>` passes `TRow` through to `RowActionsConfig`.
	const duplicate = (onAction: () => void) =>
		({
			actions: ({ row }) => [{ id: 'duplicate', label: `Duplicate ${row.original.name}`, onAction }],
		}) satisfies RowActionsConfig<Row>

	it('inline placement puts custom entries in the overflow menu beside the built-ins', async () => {
		const onAction = vi.fn()
		renderGrid({ ...EDIT_DELETE, rowActions: duplicate(onAction) })

		expect(actionLabels()).toEqual(expect.arrayContaining(['Edit', 'Delete', 'Duplicate Alice']))

		await userEvent.click(screen.getByRole('button', { name: 'Duplicate Alice' }))
		expect(onAction).toHaveBeenCalledTimes(1)
	})

	it('inline placement shares one overflow menu between custom and pin entries', () => {
		renderGrid({
			...EDIT_DELETE,
			pinning: { row: { top: true } },
			rowActions: duplicate(() => {}),
		})

		expect(actionLabels()).toEqual(expect.arrayContaining(['Pin Top', 'Duplicate Alice']))
	})

	it('menu placement folds custom entries into the single menu', async () => {
		const onAction = vi.fn()
		renderGrid({
			...EDIT_DELETE,
			rowActions: { placement: RowActionsPlacement.Menu, ...duplicate(onAction) },
		})

		expect(actionLabels()).toEqual(expect.arrayContaining(['Edit', 'Delete', 'Duplicate Alice']))

		await userEvent.click(screen.getByRole('button', { name: 'Duplicate Alice' }))
		expect(onAction).toHaveBeenCalledTimes(1)
	})

	it('draws an entry that asked for inline placement as a button in the cell', async () => {
		const onAction = vi.fn()
		renderGrid({
			...EDIT_DELETE,
			rowActions: {
				actions: () => [
					{
						id: 'duplicate',
						label: 'Duplicate',
						icon: <svg />,
						placement: RowActionsPlacement.Inline,
						onAction,
					},
				],
			},
		})

		// In the cell itself, beside Edit and Delete — not behind the overflow trigger.
		const button = screen.getByRole('button', { name: 'Duplicate' })
		expect(button.dataset.slot).toBe('row-action')

		await userEvent.click(button)
		expect(onAction).toHaveBeenCalledTimes(1)
	})

	it('keeps an inline entry in the menu when the column is collapsed to one', () => {
		renderGrid({
			...EDIT_DELETE,
			rowActions: {
				placement: RowActionsPlacement.Menu,
				actions: () => [
					{
						id: 'duplicate',
						label: 'Duplicate',
						icon: <svg />,
						placement: RowActionsPlacement.Inline,
						onAction: () => {},
					},
				],
			},
		})

		expect(screen.queryByRole('button', { name: 'Duplicate' })?.dataset.slot).not.toBe('row-action')
		expect(actionLabels()).toEqual(expect.arrayContaining(['Edit', 'Delete', 'Duplicate']))
	})

	it('renders an entry that brought its own component inside the menu', async () => {
		const onCopy = vi.fn()
		renderGrid({
			...EDIT_DELETE,
			rowActions: {
				actions: ({ row }) => [
					{
						id: 'copy',
						component: (
							<button
								type='button'
								onClick={() => {
									onCopy(row.original.name)
								}}
							>
								Copy id
							</button>
						),
					},
				],
			},
		})

		await userEvent.click(screen.getByRole('button', { name: 'Copy id' }))
		expect(onCopy).toHaveBeenCalledWith('Alice')
	})

	it('injects the actions column for a grid whose only action is a custom one', () => {
		renderGrid({ rowActions: duplicate(() => {}) })

		expect(document.querySelector(`[data-system-column='actions']`)).not.toBeNull()
		expect(actionLabels()).toEqual(expect.arrayContaining(['Duplicate Alice']))
	})

	it('renders nothing extra for a row whose callback returns no entries', () => {
		renderGrid({ ...EDIT_DELETE, rowActions: { actions: () => [] } })

		expect(actionLabels()).toEqual(['Edit', 'Delete'])
	})
})

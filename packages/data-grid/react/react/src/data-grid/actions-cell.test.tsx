import { createColumns, RowActionsVariant } from '@ez-kit/data-grid-core'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { renderWithComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { UseDataGridConfig } from '../use-data-grid'

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

	it('menu variant routes edit and delete through the menu too', () => {
		renderGrid({
			...EDIT_DELETE,
			pinning: { row: { top: true } },
			rowActions: { variant: RowActionsVariant.Menu },
		})

		// Same actions, but produced by RowActionsMenu rather than the inline buttons.
		expect(actionLabels()).toEqual(expect.arrayContaining(['Edit', 'Delete', 'Pin Top']))
	})

	it('menu variant keeps save / cancel inline while a row is being edited', async () => {
		renderGrid({ ...EDIT_DELETE, rowActions: { variant: RowActionsVariant.Menu } })

		await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

		expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
	})
})

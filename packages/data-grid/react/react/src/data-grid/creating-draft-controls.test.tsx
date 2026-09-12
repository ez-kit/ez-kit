import { createColumns } from '@ez-kit/data-grid-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { testComponents } from '../test-utils'

import { DataGrid } from './data-grid'

import type { CreatingConfig } from '@ez-kit/data-grid-core'

type Row = { id: number; name: string }
const ROWS: Row[] = [{ id: 1, name: 'Alice' }]
const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

/** The draft row's first input — the element a keypress would come from. */
function draftInput(): Element {
	const input = document.querySelector('[data-creating-row] input')
	if (input === null) throw new Error('no draft row is open')
	return input
}

function renderGrid(creating: CreatingConfig<Row>, extra?: { deleting?: boolean }) {
	render(
		<DataGrid
			data={ROWS}
			columns={COLUMNS}
			components={testComponents}
			creating={creating}
			{...(extra?.deleting === true ? { deleting: { onDelete: () => undefined } } : {})}
		>
			<DataGrid.Toolbar />
			<DataGrid.Table />
		</DataGrid>,
	)
}

/**
 * A grid whose only row-level feature is `creating` mounts no actions column — see
 * `create-table.test.ts` for why — so the draft row's save / cancel pair moves to the toolbar,
 * in place of the create trigger. `Enter` / `Escape` reach the same two commands from the row.
 */
describe('inline draft controls', () => {
	it('replaces the create trigger with save / cancel while the draft is open', () => {
		renderGrid({ mode: 'row', onSave: () => undefined })

		fireEvent.click(screen.getByText('+ Add'))

		expect(screen.queryByText('+ Add')).toBeNull()
		expect(screen.getByText('Save')).toBeInTheDocument()
		expect(screen.getByText('Cancel')).toBeInTheDocument()
	})

	it('brings the create trigger back once the draft is cancelled', () => {
		renderGrid({ mode: 'row', onSave: () => undefined })

		fireEvent.click(screen.getByText('+ Add'))
		fireEvent.click(screen.getByText('Cancel'))

		expect(screen.getByText('+ Add')).toBeInTheDocument()
		expect(screen.queryByText('Save')).toBeNull()
	})

	it('keeps the trigger a trigger when an actions column hosts the pair', () => {
		renderGrid({ mode: 'row', onSave: () => undefined }, { deleting: true })

		fireEvent.click(screen.getByText('+ Add'))

		// The row's own actions cell renders the pair, so the toolbar keeps the trigger.
		expect(screen.getByText('+ Add')).toBeInTheDocument()
		expect(document.querySelector('[data-slot="creating-save"]')).toBeNull()
		expect(document.querySelector('[data-creating-row] button')).not.toBeNull()
	})

	it('leaves the trigger alone in modal mode, where the dialog carries its own pair', () => {
		renderGrid({ mode: 'modal', onSave: () => undefined })

		fireEvent.click(screen.getByText('+ Add'))

		expect(screen.getByText('+ Add')).toBeInTheDocument()
		expect(document.querySelector('[data-slot="creating-save"]')).toBeNull()
	})

	it('commits the draft on Enter', () => {
		const onSave = vi.fn()
		renderGrid({ mode: 'row', onSave })

		fireEvent.click(screen.getByText('+ Add'))
		fireEvent.keyDown(draftInput(), { key: 'Enter' })

		expect(onSave).toHaveBeenCalledTimes(1)
	})

	it('abandons the draft on Escape', () => {
		renderGrid({ mode: 'row', onSave: () => undefined })

		fireEvent.click(screen.getByText('+ Add'))
		fireEvent.keyDown(draftInput(), { key: 'Escape' })

		expect(document.querySelector('[data-creating-row]')).toBeNull()
		expect(screen.getByText('+ Add')).toBeInTheDocument()
	})

	it('ignores Escape for a pinned draft row, which has no closed state', () => {
		renderGrid({ mode: 'pin-row', onSave: () => undefined })

		fireEvent.keyDown(draftInput(), { key: 'Escape' })

		expect(document.querySelector('[data-creating-row]')).not.toBeNull()
	})
})

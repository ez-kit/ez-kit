import { createColumns, createTable } from '@ez-kit/data-grid-core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { testComponents } from '../test-utils'

import { DataGrid } from './data-grid'

type User = { id: number; name: string; auditedBy: string }

const USERS: User[] = [{ id: 1, name: 'Alice', auditedBy: 'system' }]
const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'auditedBy', header: 'Audited by', editing: false },
])

const renderCellMode = (onSave: (args: { rowId: string; values: Partial<User> }) => void = () => {}) =>
	render(
		<DataGrid
			data={USERS}
			columns={COLUMNS}
			components={testComponents}
			editing={{
				mode: 'cell',
				onSave: (args) => {
					onSave(args)
				},
			}}
		/>,
	)

/**
 * `editing: false` used to be honoured in row and modal mode but bypassed in cell mode — the
 * render guard short-circuited on the mode, and the double-click handler was attached
 * unconditionally. A read-only column therefore became an input on double-click, and the value
 * reached `onSave`.
 */
describe('editing.mode: cell — column editing: false', () => {
	it('opens no input on a column that opted out', () => {
		renderCellMode()

		fireEvent.doubleClick(screen.getByText('system'))

		expect(screen.queryByDisplayValue('system')).toBeNull()
	})

	it('still opens an input on a column that did not', () => {
		renderCellMode()

		fireEvent.doubleClick(screen.getByText('Alice'))

		expect(screen.getByDisplayValue('Alice')).toBeTruthy()
	})

	it('ignores a programmatic startCell on a column that opted out', () => {
		const table = createTable<User>({
			data: USERS,
			columns: COLUMNS,
			editing: { mode: 'cell', onSave: async () => {} },
		})

		table.editing.startCell('0', 'auditedBy')

		expect(table.editing.getState().cellId).toBeNull()
	})
})

/**
 * Cell mode draws no Save / Cancel pair — those belong to the row flow — so leaving the cell is
 * the commit and the keyboard is the deliberate way out. Escape especially: without it a mis-typed
 * value could not be abandoned at all.
 */
describe('editing.mode: cell — keyboard', () => {
	it('gives the opened cell the focus, so the keys reach it without a click', () => {
		renderCellMode()

		fireEvent.doubleClick(screen.getByText('Alice'))

		expect(document.activeElement).toBe(screen.getByDisplayValue('Alice'))
	})

	it('commits the cell on Enter', async () => {
		const onSave = vi.fn()
		renderCellMode(onSave)

		fireEvent.doubleClick(screen.getByText('Alice'))
		fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alicia' } })
		fireEvent.keyDown(document, { key: 'Enter' })

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ values: { name: 'Alicia' } }))
		})
	})

	it('abandons the edit on Escape', () => {
		const onSave = vi.fn()
		renderCellMode(onSave)

		fireEvent.doubleClick(screen.getByText('Alice'))
		fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alicia' } })
		fireEvent.keyDown(document, { key: 'Escape' })

		expect(onSave).not.toHaveBeenCalled()
		expect(screen.queryByDisplayValue('Alicia')).toBeNull()
		expect(screen.getByText('Alice')).toBeTruthy()
	})

	it('leaves an event another control already handled alone', () => {
		renderCellMode()

		fireEvent.doubleClick(screen.getByText('Alice'))

		// What a select popover closing on its own Escape looks like from here: something nearer
		// the user consumed the key, so the cell must not also close behind it.
		const consume = (event: KeyboardEvent): void => {
			event.preventDefault()
		}
		document.addEventListener('keydown', consume, true)
		fireEvent.keyDown(document, { key: 'Escape' })
		document.removeEventListener('keydown', consume, true)

		expect(screen.getByDisplayValue('Alice')).toBeTruthy()
	})

	it('stops listening once the cell closes', () => {
		const onSave = vi.fn()
		renderCellMode(onSave)

		fireEvent.doubleClick(screen.getByText('Alice'))
		fireEvent.keyDown(document, { key: 'Escape' })
		fireEvent.keyDown(document, { key: 'Enter' })

		expect(onSave).not.toHaveBeenCalled()
	})
})

/**
 * Commit-on-leave is bound to the pointer and to focus landing elsewhere, not to the input's own
 * `blur`: react-aria's grid moves DOM focus from the input to the cell on pointer-down, so a blur
 * fires *inside* the cell before a press completes — the switch of a boolean column committed and
 * closed without ever toggling.
 */
describe('editing.mode: cell — leaving the cell', () => {
	it('commits when the pointer goes down outside the cell', async () => {
		const onSave = vi.fn()
		renderCellMode(onSave)

		fireEvent.doubleClick(screen.getByText('Alice'))
		fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alicia' } })
		fireEvent.pointerDown(screen.getByText('system'))

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ values: { name: 'Alicia' } }))
		})
	})

	it('commits when focus lands outside the cell', async () => {
		const onSave = vi.fn()
		renderCellMode(onSave)

		fireEvent.doubleClick(screen.getByText('Alice'))
		fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alicia' } })
		fireEvent.focusIn(screen.getByText('system'))

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ values: { name: 'Alicia' } }))
		})
	})

	it('stays open while the interaction is inside the cell', () => {
		const onSave = vi.fn()
		renderCellMode(onSave)

		fireEvent.doubleClick(screen.getByText('Alice'))
		const input = screen.getByDisplayValue('Alice')

		const editingCell = document.querySelector('[data-editing-cell]')
		expect(editingCell).not.toBeNull()

		// What react-aria does on pointer-down: focus moves to the cell holding the input.
		fireEvent.pointerDown(input)
		fireEvent.blur(input)
		if (editingCell) fireEvent.focusIn(editingCell)

		expect(onSave).not.toHaveBeenCalled()
		expect(screen.getByDisplayValue('Alice')).toBeTruthy()
	})
})

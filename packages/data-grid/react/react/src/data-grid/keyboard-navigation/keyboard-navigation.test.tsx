import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderGrid } from '../../test-utils'

import { KeyboardNavigationProvider } from './context'

import type { ReactNode } from 'react'

/**
 * The grid's own focus model.
 *
 * Driven through the real DOM rather than through the hook, because the whole model is DOM
 * addressing — document order, roles, and one imperative `tabIndex`. A unit test of the hook
 * would assert the arithmetic and miss every question that matters: whether the row a move lands
 * on is the row the user sees, whether the tab stop survives a re-render, whether `Alt+Arrow`
 * still reaches the reorder handlers.
 *
 * The model is off unless a bundle asked for it, so every case renders inside the provider
 * `createDataGrid({ keyboardNavigation: true })` mounts.
 */
function withNavigation(children: ReactNode) {
	return <KeyboardNavigationProvider enabled>{children}</KeyboardNavigationProvider>
}

function renderNavigableGrid() {
	return renderGrid({}, undefined, withNavigation)
}

/** The cell at `(row, cell)` in document order — the same addressing the model itself uses. */
function cellAt(row: number, cell: number): HTMLElement | undefined {
	const rowEl = document.querySelectorAll('[data-slot="tr"]')[row]
	return rowEl?.querySelectorAll<HTMLElement>('[role="gridcell"], [role="columnheader"]')[cell]
}

function active(): HTMLElement | null {
	return document.activeElement instanceof HTMLElement ? document.activeElement : null
}

/** Tab into the grid, which lands on whichever cell holds the stop — the first one on mount. */
async function focusFirstCell(user: ReturnType<typeof userEvent.setup>): Promise<void> {
	await user.tab()
	const stop = document.querySelector<HTMLElement>('[data-grid-focus]')
	stop?.focus()
}

/** The cell that currently holds the grid's single tab stop. */
function tabStop(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-grid-focus]')
}

describe('keyboard navigation', () => {
	it('gives the grid one tab stop instead of one per control', async () => {
		renderNavigableGrid()
		const user = userEvent.setup()

		await user.tab()

		// Whatever came before the grid in the tab order, one more Tab must be inside it and the
		// one after that must be past it — that is what "one tab stop" means.
		const stop = tabStop()
		expect(stop).not.toBeNull()
		expect(stop?.tabIndex).toBe(0)
		expect(
			document.querySelectorAll('[role="gridcell"][tabindex="0"], [role="columnheader"][tabindex="0"]'),
		).toHaveLength(1)
	})

	it('writes the grid roles the model navigates by', () => {
		renderNavigableGrid()

		expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0)
		expect(screen.getAllByRole('gridcell').length).toBeGreaterThan(0)
		expect(screen.getAllByRole('row').length).toBeGreaterThan(0)
	})

	it('moves the caret cell by cell with the arrow keys', async () => {
		renderNavigableGrid()
		const user = userEvent.setup()
		await focusFirstCell(user)

		// The header row first: Name → Age, then down into the body and back up.
		expect(active()).toBe(cellAt(0, 0))
		await user.keyboard('{ArrowRight}')
		expect(active()).toBe(cellAt(0, 1))
		await user.keyboard('{ArrowDown}')
		expect(active()).toBe(cellAt(1, 1))
		await user.keyboard('{ArrowLeft}')
		expect(active()).toBe(cellAt(1, 0))
		await user.keyboard('{ArrowUp}')
		expect(active()).toBe(cellAt(0, 0))
	})

	it('stays inside the grid at every edge', async () => {
		renderNavigableGrid()
		const user = userEvent.setup()
		await focusFirstCell(user)

		await user.keyboard('{ArrowLeft}{ArrowUp}')

		expect(active()).toBe(cellAt(0, 0))
	})

	it('Home and End go to the ends of the row, with Ctrl to the ends of the grid', async () => {
		renderNavigableGrid()
		const user = userEvent.setup()
		await focusFirstCell(user)
		const rows = document.querySelectorAll('[data-slot="tr"]')

		await user.keyboard('{End}')
		expect(active()).toBe(cellAt(0, 1))
		await user.keyboard('{Home}')
		expect(active()).toBe(cellAt(0, 0))

		await user.keyboard('{Control>}{End}{/Control}')
		expect(active()).toBe(cellAt(rows.length - 1, 1))
		await user.keyboard('{Control>}{Home}{/Control}')
		expect(active()).toBe(cellAt(0, 0))
	})

	it('Enter reaches a cell control and Escape comes back to the cell', async () => {
		const { table } = renderGrid({ selection: true }, undefined, withNavigation)
		expect(table).toBeTruthy()
		const user = userEvent.setup()
		await focusFirstCell(user)

		// The selection column is first, so the first body cell holds the row checkbox.
		await user.keyboard('{ArrowDown}')
		const cell = active()
		await user.keyboard('{Enter}')

		expect(active()).not.toBe(cell)
		expect(cell?.contains(active())).toBe(true)

		await user.keyboard('{Escape}')
		expect(active()).toBe(cell)
	})

	it('leaves Alt+Arrow to the column and row reordering handlers', async () => {
		const { table } = renderGrid({ ordering: true }, undefined, withNavigation)
		const user = userEvent.setup()
		await focusFirstCell(user)
		const before = active()

		await user.keyboard('{Alt>}{ArrowRight}{/Alt}')

		// The caret has not moved — the chord belongs to the reorder handler, which acted on it.
		expect(active()).toBe(before)
		expect(table.store.state.columnOrder).toEqual(['age', 'name'])
	})

	it('keeps the tab stop where the user left it across a re-render', async () => {
		const { table } = renderNavigableGrid()
		const user = userEvent.setup()
		await focusFirstCell(user)
		await user.keyboard('{ArrowDown}{ArrowRight}')
		const stopBefore = tabStop()

		// A sort re-renders every cell, and React owns `tabIndex` in the JSX — without the layout
		// effect re-applying it the stop would silently go back to the first cell.
		await act(async () => {
			table.setSorting([{ id: 'age', desc: false }])
			await Promise.resolve()
		})

		expect(tabStop()).not.toBeNull()
		expect(tabStop()?.getAttribute('role')).toBe(stopBefore?.getAttribute('role'))
		expect(document.querySelectorAll('[data-grid-focus]')).toHaveLength(1)
	})

	it('takes the controls inside cells out of the tab order', () => {
		renderGrid({ selection: true, sorting: true }, undefined, withNavigation)

		// The grid has sort triggers, a select-all checkbox and a checkbox per row. Every one of
		// them was its own tab stop before the model, and that — not the cells — is what made
		// crossing the grid cost 10 to 14 presses.
		const controls = [...document.querySelectorAll<HTMLElement>('[role="gridcell"] *, [role="columnheader"] *')].filter(
			(el) => el.matches('button, input, select, textarea, a[href]'),
		)
		expect(controls.length).toBeGreaterThan(0)
		expect(controls.filter((el) => el.tabIndex !== -1)).toEqual([])
	})

	it('gives a cell its controls back while the caret is inside it, and takes them away again', async () => {
		renderGrid({ selection: true }, undefined, withNavigation)
		const user = userEvent.setup()
		await focusFirstCell(user)
		await user.keyboard('{ArrowDown}')
		const cell = active()

		await user.keyboard('{Enter}')
		const inside = [...(cell?.querySelectorAll<HTMLElement>('button, input') ?? [])]
		expect(inside.length).toBeGreaterThan(0)
		expect(inside.every((el) => el.tabIndex === 0)).toBe(true)

		await user.keyboard('{Escape}')
		expect(inside.every((el) => el.tabIndex === -1)).toBe(true)
	})

	it('renders none of it when no bundle asked for the model', () => {
		renderGrid()

		expect(document.querySelector('[role="gridcell"]')).toBeNull()
		expect(document.querySelector('[data-grid-focus]')).toBeNull()
		expect(document.querySelector('[role="grid"]')).toBeNull()
	})
})

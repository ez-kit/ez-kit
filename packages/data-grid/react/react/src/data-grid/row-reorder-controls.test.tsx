import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { TEST_COLUMNS, TEST_FEATURES, TEST_ROWS, testComponents } from '../test-utils'

import type { DndAdapter, DragSpec } from './dnd'
import type { RowOrderingConfig } from '@ez-kit/data-grid-core'

/**
 * `ordering.row.controls`: which of the grip and the menu step pair a row is offered, with and
 * without a drag adapter. One case per row of the table in `RowOrderingConfig.controls`'s JSDoc.
 */

const inertAdapter: DndAdapter = {
	Provider: ({ children }) => <>{children}</>,
	useSortableItem: () => ({ ref: () => {}, handleRef: () => {}, isDragging: false }),
}

type Controls = RowOrderingConfig['controls']

function renderGrid(controls: Controls, { adapter, extra = {} }: { adapter: boolean; extra?: object }) {
	const { DataGrid } = createDataGrid({ components: testComponents, ...(adapter ? { dnd: inertAdapter } : {}) })
	return render(
		<DataGrid
			features={TEST_FEATURES}
			data={TEST_ROWS}
			columns={TEST_COLUMNS}
			getRowId={(row) => String(row.id)}
			ordering={{ row: controls === undefined ? true : { controls } }}
			{...extra}
		/>,
	)
}

const stepEntries = () => screen.queryAllByRole('button', { name: /^Move (up|down)$/ })
const dragColumn = () => document.querySelector('[data-system-column="drag"]')
const actionsColumn = () => document.querySelector('[data-system-column="actions"]')
const rowMenuTriggers = () => document.querySelectorAll('[data-system-column="actions"] [data-slot="menu-trigger"]')
const renderedIds = () =>
	[...document.querySelectorAll('[data-slot="tbody"] [data-row-id]')].map((tr) => tr.getAttribute('data-row-id'))

type Expected = { grip: boolean; menu: boolean }

const GRIP: Expected = { grip: true, menu: false }
const MENU: Expected = { grip: false, menu: true }
const BOTH: Expected = { grip: true, menu: true }
const NONE: Expected = { grip: false, menu: false }

const MODES: [label: string, controls: Controls, withAdapter: Expected, without: Expected][] = [
	['omitted', undefined, BOTH, MENU],
	['true', true, GRIP, MENU],
	["'drag'", 'drag', GRIP, MENU],
	["'step'", 'step', MENU, MENU],
	["'both'", 'both', BOTH, MENU],
	['false', false, NONE, NONE],
]

afterEach(() => {
	vi.restoreAllMocks()
})

describe('ordering.row.controls', () => {
	describe.each([
		['with an adapter', true],
		['without an adapter', false],
	] as const)('%s', (_, adapter) => {
		it.each(MODES)('%s offers the documented affordances', (_label, controls, withAdapter, without) => {
			// Arrange — the missing-adapter warning is asserted separately below
			vi.spyOn(console, 'warn').mockImplementation(() => {})
			const expected = adapter ? withAdapter : without

			// Act
			renderGrid(controls, { adapter })

			// Assert
			expect(dragColumn() !== null).toBe(expected.grip)
			expect(stepEntries()).toHaveLength(expected.menu ? TEST_ROWS.length * 2 : 0)
			// Row ordering is the only row action here, so the menu exists exactly when its pair does.
			expect(rowMenuTriggers()).toHaveLength(expected.menu ? TEST_ROWS.length : 0)
			expect(actionsColumn() !== null).toBe(expected.menu)
		})
	})

	it("keeps Alt+Arrow under 'drag', where the menu has no step pair", () => {
		renderGrid('drag', { adapter: true })
		expect(stepEntries()).toHaveLength(0)

		fireEvent.keyDown(screen.getByText('Alice'), { key: 'ArrowDown', altKey: true })

		expect(renderedIds()).toEqual(['2', '1', '3'])
	})

	it('keeps Alt+Arrow under `false`, where the row offers nothing', () => {
		renderGrid(false, { adapter: true })

		fireEvent.keyDown(screen.getByText('Carol'), { key: 'ArrowUp', altKey: true })

		expect(renderedIds()).toEqual(['1', '3', '2'])
	})

	it("draws no row menu under 'drag' once the pair was all it held, beside other row actions", () => {
		// Inline delete stays a button of its own; the overflow menu has nothing left to hold.
		renderGrid('drag', { adapter: true, extra: { deleting: { onDelete: () => {} } } })

		expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(TEST_ROWS.length)
		expect(rowMenuTriggers()).toHaveLength(0)
	})

	it('names the overflow menu for what is left in it', () => {
		const pinning = { row: { top: true } }

		const { unmount } = renderGrid('both', { adapter: true, extra: { pinning } })
		expect(rowMenuTriggers()[0]).toHaveAttribute('aria-label', 'Row actions')
		unmount()

		renderGrid('drag', { adapter: true, extra: { pinning } })
		expect(rowMenuTriggers()[0]).toHaveAttribute('aria-label', 'Row pinning')
	})

	it("makes rows draggable only under a mode with a grip — not under 'step'", () => {
		const specs: DragSpec[] = []
		const recording: DndAdapter = {
			...inertAdapter,
			useSortableItem: (spec) => {
				if (spec.axis === 'row') specs.push(spec)
				return inertAdapter.useSortableItem(spec)
			},
		}
		const { DataGrid } = createDataGrid({ components: testComponents, dnd: recording })
		render(
			<DataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
				ordering={{ row: { controls: 'step' } }}
			/>,
		)

		expect(specs.length).toBeGreaterThan(0)
		expect(specs.every((spec) => spec.disabled)).toBe(true)
	})

	it("warns in development when 'drag' is written without an adapter", () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		renderGrid('drag', { adapter: false })

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('`ordering.row.controls` asks for a drag handle'))
	})

	it('does not warn for the default without an adapter', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		renderGrid(undefined, { adapter: false })

		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('ordering.row.controls'))
	})
})

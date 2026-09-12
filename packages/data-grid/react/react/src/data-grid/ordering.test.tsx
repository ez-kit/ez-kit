import { createColumns, defaultMessages } from '@ez-kit/data-grid-core'
import { act, fireEvent, render, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { isGridMenuItemSlot } from '../menu'
import { testComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { buildColumnMenuSections } from './column-menu-sections'
import { DataGrid } from './data-grid'

import type { DataTable } from '@ez-kit/data-grid-core'

type User = { id: number; name: string; email: string; age: number }

const DATA: User[] = [{ id: 1, name: 'Alice', email: 'alice@example.com', age: 30 }]

const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age' },
])

function gridWith(ordering: boolean): DataTable<User> {
	const { result } = renderHook(() => useDataGrid<User>({ data: DATA, columns: COLUMNS, ordering }))
	return result.current
}

/** The menu's reordering section, built exactly as the header cell builds it. */
function orderSection(table: DataTable<User>, columnId: string) {
	const header = table.getHeaderGroups()[0]?.headers.find((h) => h.column.id === columnId)
	if (!header) throw new Error(`no header for ${columnId}`)
	const sections = buildColumnMenuSections(
		header,
		{ canSort: false, canPin: false, canHide: false, canMove: table.grid.ordering.column },
		defaultMessages.columnMenu,
	)
	return sections.find((section) => section.id === 'order')
}

describe('column ordering — the menu pair', () => {
	it('offers no move entries until the feature is on', () => {
		const table = gridWith(false)

		expect(table.grid.ordering.column).toBe(false)
		expect(orderSection(table, 'email')).toBeUndefined()
	})

	it('lists both directions, disabled at the ends', () => {
		const items = orderSection(gridWith(true), 'name')?.items

		expect(items?.map((item) => item.id)).toEqual(['move-start', 'move-end'])
		// Listed but disabled rather than absent: entries that come and go make the menu jump.
		expect(items?.[0]).toMatchObject({ disabled: true })
		expect(items?.[1]).toMatchObject({ disabled: false })
	})

	it('moves the column one step and reports the full order', () => {
		const onChange = vi.fn()
		const { result } = renderHook(() =>
			useDataGrid<User>({ data: DATA, columns: COLUMNS, ordering: { column: { onChange } } }),
		)

		const move = orderSection(result.current, 'age')?.items.find((item) => item.id === 'move-start')
		// Everything the grid builds itself is a `GridMenuItemDef`; only a consumer's own action
		// can be the slot form, which is why this narrowing is a test-only concern.
		if (!move || isGridMenuItemSlot(move)) throw new Error('no move entry')
		act(() => {
			move.onAction()
		})

		expect(onChange).toHaveBeenCalledWith(['name', 'age', 'email'])
	})
})

describe('column ordering — Alt+Arrow on the header', () => {
	/** The whole grid, so the assertion covers the repaint and not just the state. */
	function renderGrid(ordering: boolean) {
		const captured: { table?: DataTable<User> } = {}

		function Grid() {
			const table = useDataGrid<User>({ data: DATA, columns: COLUMNS, ordering })
			captured.table = table
			return <DataGrid table={table} />
		}

		const view = render(
			<GridComponentsProvider components={testComponents}>
				<Grid />
			</GridComponentsProvider>,
		)
		const headerOrder = (): (string | null)[] =>
			[...view.container.querySelectorAll('thead th')].map((th) => th.getAttribute('data-column-id'))
		const th = (columnId: string): Element => {
			const element = view.container.querySelector(`[data-column-id="${columnId}"]`)
			if (!element) throw new Error(`no header cell for ${columnId}`)
			return element
		}
		return { captured, headerOrder, th }
	}

	it('moves the column the arrow points at, and repaints the header', () => {
		const { headerOrder, th } = renderGrid(true)

		fireEvent.keyDown(th('email'), { key: 'ArrowRight', altKey: true })

		expect(headerOrder()).toEqual(['name', 'age', 'email'])
	})

	it('ignores the arrow without Alt, so header typeahead keeps working', () => {
		const { captured, th } = renderGrid(true)

		fireEvent.keyDown(th('email'), { key: 'ArrowRight' })

		expect(captured.table?.getState().columnOrder).toEqual([])
	})

	it('does nothing when the feature is off', () => {
		const { captured, th } = renderGrid(false)

		fireEvent.keyDown(th('email'), { key: 'ArrowLeft', altKey: true })

		expect(captured.table?.getState().columnOrder).toEqual([])
		expect(th('email').getAttribute('data-movable')).toBeNull()
	})
})

import { createColumns } from '@ez-kit/data-grid-core'
import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { testComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { VisibilityColumnItem } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'

type User = { id: number; name: string; email: string; age: number }

const DATA: User[] = [{ id: 1, name: 'Alice', email: 'alice@example.com', age: 30 }]

const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age' },
])

/**
 * Renders the trigger's render-prop form, which is the contract itself: whatever a kit's
 * `VisibilityMenu` is handed is exactly what lands here.
 */
function renderPanel(options: Partial<UseDataGridConfig<User>> = {}) {
	let items: VisibilityColumnItem[] = []

	function Grid() {
		const table = useDataGrid<User>({ data: DATA, columns: COLUMNS, visibility: true, ...options })
		return (
			<DataGrid table={table}>
				<DataGrid.VisibilityTrigger>
					{({ columns }) => {
						items = columns
						return null
					}}
				</DataGrid.VisibilityTrigger>
			</DataGrid>
		)
	}

	render(
		<GridComponentsProvider components={testComponents}>
			<Grid />
		</GridComponentsProvider>,
	)

	return {
		get items() {
			return items
		},
		get ids() {
			return items.map((item) => item.id)
		},
		item(id: string) {
			const found = items.find((entry) => entry.id === id)
			if (!found) throw new Error(`no panel row for ${id}`)
			return found
		},
	}
}

const ORDERING_ON = { ordering: { column: { visibilityMenu: true } } } as const

describe('the Columns toggle, left alone', () => {
	it('offers no moves until the option asks for them', () => {
		expect(renderPanel().item('email').ordering).toBeUndefined()
		expect(renderPanel({ ordering: true }).item('email').ordering).toBeUndefined()
		expect(renderPanel({ ordering: { column: true } }).item('email').ordering).toBeUndefined()
	})

	it('still lists only the hideable columns', () => {
		const panel = renderPanel({
			columns: createColumns<User>([
				{ accessorKey: 'name', header: 'Name', visibility: false },
				{ accessorKey: 'email', header: 'Email' },
			]),
		})

		expect(panel.ids).toEqual(['email'])
	})

	it('cannot offer moves while the column axis is off', () => {
		// The option sits on that axis, so this is really "the object survived a defaults layer
		// whose feature did not" — `enabled: false` is a real off-switch, not a UI hint.
		const panel = renderPanel({ ordering: { column: { enabled: false, visibilityMenu: true } } })

		expect(panel.item('email').ordering).toBeUndefined()
	})
})

describe('the Columns toggle as a column panel', () => {
	it('lists every non-system column, locked ones included', () => {
		const panel = renderPanel({
			...ORDERING_ON,
			selection: true,
			columns: createColumns<User>([
				{ accessorKey: 'name', header: 'Name', visibility: false },
				{ accessorKey: 'email', header: 'Email' },
			]),
		})

		expect(panel.ids).toEqual(['name', 'email'])
		// Listed, but the toggle is not offered: the invariant that such a column can never be
		// hidden is what puts `canHide: false` here rather than leaving the row out.
		expect(panel.item('name').canHide).toBe(false)
		expect(panel.item('email').canHide).toBe(true)
	})

	it('reads the list as the order, and moves a row one place along it', () => {
		const panel = renderPanel(ORDERING_ON)

		expect(panel.ids).toEqual(['name', 'email', 'age'])
		act(() => {
			panel.item('age').ordering?.onMoveStart()
		})

		expect(panel.ids).toEqual(['name', 'age', 'email'])
	})

	it('moves repeatedly, each step reading the order it just wrote', () => {
		const panel = renderPanel(ORDERING_ON)

		act(() => {
			panel.item('age').ordering?.onMoveStart()
		})
		act(() => {
			panel.item('age').ordering?.onMoveStart()
		})

		expect(panel.ids).toEqual(['age', 'name', 'email'])
	})

	it('lands on a hidden row instead of jumping over it', () => {
		// The header steps past what the table hides; here the row is on screen, and a step that
		// skipped it would look like it moved two places.
		const panel = renderPanel({
			...ORDERING_ON,
			columns: createColumns<User>([
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'email', header: 'Email', visibility: { initialHidden: true } },
				{ accessorKey: 'age', header: 'Age' },
			]),
		})

		act(() => {
			panel.item('age').ordering?.onMoveStart()
		})

		expect(panel.ids).toEqual(['name', 'age', 'email'])
	})

	it('reports both ends as unavailable rather than dropping the controls', () => {
		const panel = renderPanel(ORDERING_ON)

		expect(panel.item('name').ordering).toMatchObject({ canMoveStart: false, canMoveEnd: true })
		expect(panel.item('age').ordering).toMatchObject({ canMoveStart: true, canMoveEnd: false })
	})

	it('carries a disabled pair for a column the author locked', () => {
		const panel = renderPanel({
			...ORDERING_ON,
			columns: createColumns<User>([
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'email', header: 'Email', ordering: false },
				{ accessorKey: 'age', header: 'Age' },
			]),
		})

		expect(panel.item('email').ordering).toMatchObject({ canMoveStart: false, canMoveEnd: false })
		// And it is not a landing spot either, which is what leaves its neighbours stuck.
		expect(panel.item('name').ordering).toMatchObject({ canMoveEnd: false })
	})

	it('leaves hiding alone — a move does not change what is visible', () => {
		const panel = renderPanel(ORDERING_ON)

		act(() => {
			panel.item('email').onToggle()
		})

		expect(panel.item('email').isVisible).toBe(false)
		act(() => {
			panel.item('email').ordering?.onMoveStart()
		})

		expect(panel.ids).toEqual(['email', 'name', 'age'])
		expect(panel.item('email').isVisible).toBe(false)
	})
})

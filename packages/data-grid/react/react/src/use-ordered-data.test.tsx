import { createColumns, RowMoveDirection } from '@ez-kit/data-grid-core'
import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from './components-context'
import { DataGrid } from './data-grid/data-grid'
import { testComponents } from './test-utils'
import { useDataGrid } from './use-data-grid'

import type { OrderingConfig, DataTable } from '@ez-kit/data-grid-core'

type User = { id: string; name: string }

const DATA: User[] = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
	{ id: 'c', name: 'C' },
]

const COLUMNS = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])

/** The whole grid, so an assertion covers the repaint and not just the state. */
function renderGrid(ordering: OrderingConfig, data: User[] = DATA) {
	const captured: { table?: DataTable<User> } = {}

	function Grid({ rows }: { rows: User[] }) {
		const table = useDataGrid<User>({ data: rows, columns: COLUMNS, getRowId: (row) => row.id, ordering })
		captured.table = table
		return <DataGrid table={table} />
	}

	const view = render(
		<GridComponentsProvider components={testComponents}>
			<Grid rows={data} />
		</GridComponentsProvider>,
	)

	const renderedIds = (): (string | null)[] =>
		[...view.container.querySelectorAll('tbody [data-row-id]')].map((tr) => tr.getAttribute('data-row-id'))

	const table = (): DataTable<User> => {
		if (!captured.table) throw new Error('grid did not render')
		return captured.table
	}

	return { renderedIds, table, view, Grid }
}

describe('uncontrolled row order', () => {
	it('renders data exactly as given until a row moves', () => {
		// Arrange + Act
		const { renderedIds } = renderGrid({ row: true })

		// Assert
		expect(renderedIds()).toEqual(['a', 'b', 'c'])
	})

	it('repaints in the new order after a move', () => {
		const { renderedIds, table } = renderGrid({ row: true })

		act(() => {
			table().ordering.moveRow('a', RowMoveDirection.Down)
		})

		expect(renderedIds()).toEqual(['b', 'a', 'c'])
	})

	it('keeps stepping in the same direction', () => {
		// The second step is computed from where the row now is, not from where it started.
		const { renderedIds, table } = renderGrid({ row: true })

		act(() => {
			table().ordering.moveRow('a', RowMoveDirection.Down)
		})
		act(() => {
			table().ordering.moveRow('a', RowMoveDirection.Down)
		})

		expect(renderedIds()).toEqual(['b', 'c', 'a'])
	})

	it('re-projects a later `data` prop through the order', () => {
		// A fresh page from the server must not quietly discard the arrangement the user made.
		const { renderedIds, table, view, Grid } = renderGrid({ row: true })

		act(() => {
			table().ordering.moveRow('a', RowMoveDirection.Down)
		})
		view.rerender(
			<GridComponentsProvider components={testComponents}>
				<Grid rows={[...DATA]} />
			</GridComponentsProvider>,
		)

		expect(renderedIds()).toEqual(['b', 'a', 'c'])
	})
})

describe('controlled row order', () => {
	it('reports the move and repaints nothing by itself', () => {
		const onChange = vi.fn()
		const { renderedIds, table } = renderGrid({ row: { onChange } })

		act(() => {
			table().ordering.moveRow('a', RowMoveDirection.Down)
		})

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange).toHaveBeenCalledWith({
			rowId: 'a',
			targetRowId: 'b',
			direction: RowMoveDirection.Down,
		})
		expect(renderedIds()).toEqual(['a', 'b', 'c'])
	})
})

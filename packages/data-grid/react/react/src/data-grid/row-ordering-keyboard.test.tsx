import { createColumns } from '@ez-kit/data-grid-core'
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { TEST_FEATURES, testComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { GridFeatures } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'

type User = { id: string; name: string }

const DATA: User[] = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
	{ id: 'c', name: 'C' },
]

const COLUMNS = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])

type GridExtras = Pick<UseDataGridConfig<GridFeatures, User>, 'ordering' | 'selection'>

function renderGrid(extras: GridExtras) {
	function Grid() {
		const table = useDataGrid<GridFeatures, User>({
			features: TEST_FEATURES,
			data: DATA,
			columns: COLUMNS,
			getRowId: (row: User) => row.id,
			...extras,
		})
		return <DataGrid table={table} />
	}

	const view = render(
		<GridComponentsProvider components={testComponents}>
			<Grid />
		</GridComponentsProvider>,
	)

	const renderedIds = (): (string | null)[] =>
		[...view.container.querySelectorAll('tbody [data-row-id]')].map((tr) => tr.getAttribute('data-row-id'))

	const row = (rowId: string): Element => {
		const element = view.container.querySelector(`tbody [data-row-id="${rowId}"]`)
		if (!element) throw new Error(`no row ${rowId}`)
		return element
	}

	return { renderedIds, row, view }
}

describe('Alt+Arrow on a row', () => {
	it('moves the row down', () => {
		// Arrange
		const { renderedIds, row } = renderGrid({ ordering: { row: true }, selection: true })

		// Act — from a control inside the row, which is where a row's focus always is
		const checkbox = row('a').querySelector('input, button')
		fireEvent.keyDown(checkbox ?? row('a'), { key: 'ArrowDown', altKey: true })

		// Assert
		expect(renderedIds()).toEqual(['b', 'a', 'c'])
	})

	it('moves the row up', () => {
		const { renderedIds, row } = renderGrid({ ordering: { row: true }, selection: true })

		fireEvent.keyDown(row('c'), { key: 'ArrowUp', altKey: true })

		expect(renderedIds()).toEqual(['a', 'c', 'b'])
	})

	it('ignores the arrow without Alt', () => {
		const { renderedIds, row } = renderGrid({ ordering: { row: true }, selection: true })

		fireEvent.keyDown(row('a'), { key: 'ArrowDown' })

		expect(renderedIds()).toEqual(['a', 'b', 'c'])
	})

	it('does nothing at an end of the order', () => {
		const { renderedIds, row } = renderGrid({ ordering: { row: true }, selection: true })

		fireEvent.keyDown(row('a'), { key: 'ArrowUp', altKey: true })

		expect(renderedIds()).toEqual(['a', 'b', 'c'])
	})

	it('leaves the shortcut to a text field inside the row', () => {
		// `Option+Arrow` moves by word there; stealing it would break editing mid-word.
		const { renderedIds, row } = renderGrid({ ordering: { row: true } })
		const input = document.createElement('input')
		row('a').appendChild(input)

		fireEvent.keyDown(input, { key: 'ArrowDown', altKey: true })

		expect(renderedIds()).toEqual(['a', 'b', 'c'])
	})

	it('does nothing while the feature is off', () => {
		const { renderedIds, row } = renderGrid({ selection: true })

		fireEvent.keyDown(row('a'), { key: 'ArrowDown', altKey: true })

		expect(renderedIds()).toEqual(['a', 'b', 'c'])
	})
})

describe('data-movable', () => {
	it('marks every row while the feature is on', () => {
		const { row } = renderGrid({ ordering: { row: true } })

		expect(row('a').getAttribute('data-movable')).toBe('true')
		expect(row('b').getAttribute('data-movable')).toBe('true')
	})

	it('marks nothing while it is off', () => {
		const { row } = renderGrid({})

		expect(row('a').getAttribute('data-movable')).toBeNull()
	})
})

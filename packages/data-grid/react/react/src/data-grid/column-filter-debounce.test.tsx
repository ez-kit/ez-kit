import { createColumns } from '@ez-kit/data-grid-core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { testComponents } from '../test-utils'

import { DataGrid } from './data-grid'

type Row = { id: number; name: string; note: string }

const ROWS: Row[] = [
	{ id: 1, name: 'Alice', note: 'first' },
	{ id: 2, name: 'Bob', note: 'second' },
]

const TABLE_DEBOUNCE = 250
const COLUMN_DEBOUNCE = 800

/**
 * `filtering.debounce` existed only on the table, while `editing.debounce` and
 * `creating.debounce` have always existed at both levels — so one dear endpoint could not be
 * given a longer wait without retiming every filter in the grid.
 */
describe('column-level filtering.debounce', () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true })
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	function setup() {
		const columns = createColumns<Row>([
			{ accessorKey: 'name', header: 'Name' },
			{ accessorKey: 'note', header: 'Note', filtering: { debounce: COLUMN_DEBOUNCE } },
		])
		const result = render(
			<DataGrid
				data={ROWS}
				columns={columns}
				components={testComponents}
				filtering={{ debounce: TABLE_DEBOUNCE }}
			/>,
		)
		return result
	}

	it("waits the column's own debounce before committing, not the table's", () => {
		setup()
		const noteFilter = screen.getByPlaceholderText('Filter note…')

		fireEvent.change(noteFilter, { target: { value: 'first' } })

		// Past the table-level wait, still nothing: this column asked for longer.
		act(() => {
			vi.advanceTimersByTime(TABLE_DEBOUNCE + 50)
		})
		expect(screen.getByText('Bob')).toBeInTheDocument()

		act(() => {
			vi.advanceTimersByTime(COLUMN_DEBOUNCE)
		})
		expect(screen.queryByText('Bob')).toBeNull()
		expect(screen.getByText('Alice')).toBeInTheDocument()
	})

	it('leaves a column without its own debounce on the table-level one', () => {
		setup()
		const nameFilter = screen.getByPlaceholderText('Filter name…')

		fireEvent.change(nameFilter, { target: { value: 'Alice' } })

		act(() => {
			vi.advanceTimersByTime(TABLE_DEBOUNCE + 50)
		})
		expect(screen.queryByText('Bob')).toBeNull()
	})
})

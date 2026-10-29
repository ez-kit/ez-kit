import { createColumns } from '@ez-kit/data-grid-core'
import { act } from '@testing-library/react'
import { StrictMode, useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithComponents, TEST_FEATURES, TEST_OPERATORS } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { DataTable, GridFeatures } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'
import type { ReactElement } from 'react'

type Quote = {
	id: string
	symbol: string
	price: number
	tags?: string[]
	listed?: Date
	region?: string
}

const R1: Quote = { id: 'r1', symbol: 'AAA', price: 100, region: 'EU' }
const R2: Quote = { id: 'r2', symbol: 'BBB', price: 200, region: 'EU' }
const QUOTES: Quote[] = [R1, R2]

const COLUMNS = createColumns<Quote>([
	{ accessorKey: 'symbol', header: 'Symbol' },
	{ accessorKey: 'price', header: 'Price' },
])

type Harness = {
	table: DataTable<GridFeatures, Quote>
	setData: (data: Quote[]) => void
	container: HTMLElement
}

/** A grid whose `data` lives in state, the way a polled or socket-fed grid holds it. */
function renderFlashing(
	config: Partial<UseDataGridConfig<GridFeatures, Quote>> = {},
	initial: Quote[] = QUOTES,
	options: { strict?: boolean } = {},
): Harness {
	const handle: { table: DataTable<GridFeatures, Quote> | null; setData: ((data: Quote[]) => void) | null } = {
		table: null,
		setData: null,
	}

	function Grid(): ReactElement {
		const [data, setData] = useState(initial)
		const table = useDataGrid<GridFeatures, Quote>({
			features: TEST_FEATURES,
			operators: TEST_OPERATORS,
			data,
			columns: COLUMNS,
			getRowId: (row) => row.id,
			...config,
		})
		useEffect(() => {
			handle.table = table
			handle.setData = setData
		}, [table])
		return <DataGrid<GridFeatures, Quote> table={table} />
	}

	const ui =
		options.strict === true ? (
			<StrictMode>
				<Grid />
			</StrictMode>
		) : (
			<Grid />
		)
	const { container } = renderWithComponents(ui)
	if (!handle.table || !handle.setData) throw new Error('the grid never mounted')
	const { table, setData } = handle as { table: DataTable<GridFeatures, Quote>; setData: (data: Quote[]) => void }
	return {
		table,
		setData: (next) => {
			act(() => {
				setData(next)
			})
		},
		container,
	}
}

/** The body cell of a row and a column, found by the row's text in the first column. */
function cellOf(container: HTMLElement, rowIndex: number, columnIndex: number): HTMLElement {
	const rows = container.querySelectorAll('[data-slot="tbody"] [data-slot="tr"]')
	const cell = rows[rowIndex]?.querySelectorAll('[data-slot="td"]')[columnIndex]
	if (!(cell instanceof HTMLElement)) throw new Error(`no cell at ${String(rowIndex)}:${String(columnIndex)}`)
	return cell
}

const flashOf = (cell: HTMLElement): string | null => cell.getAttribute('data-flash')

function advance(ms: number): void {
	act(() => {
		vi.advanceTimersByTime(ms)
	})
}

beforeEach(() => {
	vi.useFakeTimers()
})

afterEach(() => {
	vi.useRealTimers()
})

describe('automatic flash', () => {
	it('does not flash on the first render', () => {
		const { container } = renderFlashing({ flashing: true })

		expect(container.querySelectorAll('[data-flash]')).toHaveLength(0)
	})

	it('flashes the one cell whose value changed', () => {
		const { container, setData } = renderFlashing({ flashing: true })

		setData([{ ...R1, price: 101 }, { ...R2 }])

		expect(flashOf(cellOf(container, 0, 1))).toBe('flash')
		expect(container.querySelectorAll('[data-flash]')).toHaveLength(1)
	})

	it('does not flash fresh row objects that carry the same values', () => {
		const { container, setData } = renderFlashing({ flashing: true })

		setData(QUOTES.map((row) => ({ ...row })))

		expect(container.querySelectorAll('[data-flash]')).toHaveLength(0)
	})

	it('runs the flash and fade phases, then clears, with the fade duration on the cell', () => {
		const { container, setData } = renderFlashing({ flashing: true })

		setData([{ ...R1, price: 101 }, R2])
		const cell = cellOf(container, 0, 1)
		expect(flashOf(cell)).toBe('flash')
		expect(cell.style.getPropertyValue('--dg-flash-fade-duration')).toBe('1000ms')

		advance(500)
		expect(flashOf(cell)).toBe('fade')

		advance(1000)
		expect(flashOf(cell)).toBeNull()
		expect(cell.style.getPropertyValue('--dg-flash-fade-duration')).toBe('')
	})

	it('restarts from the flash phase when the value changes again mid-fade', () => {
		const { container, setData } = renderFlashing({ flashing: true })

		setData([{ ...R1, price: 101 }, R2])
		advance(800)
		expect(flashOf(cellOf(container, 0, 1))).toBe('fade')

		setData([{ ...R1, price: 102 }, R2])
		expect(flashOf(cellOf(container, 0, 1))).toBe('flash')
		advance(1499)
		expect(flashOf(cellOf(container, 0, 1))).toBe('fade')
		advance(1)
		expect(flashOf(cellOf(container, 0, 1))).toBeNull()
	})

	it('does not flash when a sort reorders rows whose values did not change', () => {
		const { container, table } = renderFlashing({ flashing: true, sorting: true })

		act(() => {
			table.setSorting([{ id: 'price', desc: true }])
		})

		expect(cellOf(container, 0, 0).textContent).toBe('BBB')
		expect(container.querySelectorAll('[data-flash]')).toHaveLength(0)
	})

	it('raises no false flash under StrictMode', () => {
		const { container, setData } = renderFlashing({ flashing: true }, QUOTES, { strict: true })
		expect(container.querySelectorAll('[data-flash]')).toHaveLength(0)

		setData([{ ...R1, price: 101 }, R2])

		expect(container.querySelectorAll('[data-flash]')).toHaveLength(1)
	})

	it('flashes nothing when the option is off', () => {
		const { container, setData } = renderFlashing()

		setData([{ ...R1, price: 101 }, R2])

		expect(container.querySelectorAll('[data-flash]')).toHaveLength(0)
	})

	it('a column false stays dark under a grid that is on', () => {
		const columns = createColumns<Quote>([
			{ accessorKey: 'symbol', header: 'Symbol' },
			{ accessorKey: 'price', header: 'Price', flashing: false },
		])
		const { container, setData } = renderFlashing({ flashing: true, columns })

		setData([{ ...R1, price: 101 }, R2])

		expect(container.querySelectorAll('[data-flash]')).toHaveLength(0)
	})
})

describe('value comparison', () => {
	it('treats two dates with the same time as equal', () => {
		const columns = createColumns<Quote>([{ accessorKey: 'listed', header: 'Listed', cell: { component: () => 'x' } }])
		const rows = [{ ...R1, listed: new Date(2026, 0, 1) }]
		const { container, setData } = renderFlashing({ flashing: true, columns }, rows)

		setData([{ ...R1, listed: new Date(2026, 0, 1) }])

		expect(container.querySelectorAll('[data-flash]')).toHaveLength(0)
	})

	it('asks the column equals when there is one', () => {
		const columns = createColumns<Quote>([
			{
				accessorKey: 'tags',
				header: 'Tags',
				cell: { component: () => 'x' },
				flashing: { equals: (a, b) => String(a) === String(b) },
			},
		])
		const rows = [{ ...R1, tags: ['a', 'b'] }]
		const { container, setData } = renderFlashing({ flashing: true, columns }, rows)

		setData([{ ...R1, tags: ['a', 'b'] }])

		expect(container.querySelectorAll('[data-flash]')).toHaveLength(0)
	})

	it('flashes a fresh array with the same items when the column has no equals', () => {
		const columns = createColumns<Quote>([{ accessorKey: 'tags', header: 'Tags', cell: { component: () => 'x' } }])
		const rows = [{ ...R1, tags: ['a', 'b'] }]
		const { container, setData } = renderFlashing({ flashing: true, columns }, rows)

		setData([{ ...R1, tags: ['a', 'b'] }])

		expect(container.querySelectorAll('[data-flash]')).toHaveLength(1)
	})
})

describe('editing', () => {
	const editable: Partial<UseDataGridConfig<GridFeatures, Quote>> = {
		flashing: true,
		editing: { mode: 'cell', onSave: () => undefined },
	}

	it('does not flash under an open editor, nor after a cancel that follows an update', () => {
		const { container, setData, table } = renderFlashing(editable)
		act(() => {
			table.editing.startCell('r1', 'price')
		})

		setData([{ ...R1, price: 101 }, R2])
		expect(container.querySelectorAll('[data-flash]')).toHaveLength(0)

		act(() => {
			table.editing.cancel()
		})
		expect(cellOf(container, 0, 1).textContent).toBe('101')
		expect(container.querySelectorAll('[data-flash]')).toHaveLength(0)
	})

	it('flashes a saved value once it arrives in data', () => {
		const { container, setData } = renderFlashing(editable)

		setData([{ ...R1, price: 150 }, R2])

		expect(flashOf(cellOf(container, 0, 1))).toBe('flash')
	})
})

describe('system and group cells', () => {
	it('never flashes a system cell', () => {
		const { container, table } = renderFlashing({ flashing: true, selection: true })

		act(() => {
			table.flashCells({ rowIds: ['r1'] })
		})

		const flashed = [...container.querySelectorAll('[data-flash]')]
		expect(flashed).toHaveLength(2)
		expect(flashed.every((cell) => cell.getAttribute('data-system-column') === null)).toBe(true)
	})

	it('flashes an aggregate on a group row when the group total changes', () => {
		const columns = createColumns<Quote>([
			{ accessorKey: 'region', header: 'Region' },
			{ accessorKey: 'price', header: 'Price', aggregation: 'sum' },
		])
		const { container, setData } = renderFlashing({ flashing: true, columns, grouping: { by: ['region'] } })

		setData([{ ...R1, price: 101 }, R2])

		const aggregated = container.querySelector('[data-aggregated-cell]')
		expect(aggregated?.getAttribute('data-flash')).toBe('flash')
	})
})

describe('manual flash', () => {
	it('flashes every rendered data cell of the addressed row and nothing else', () => {
		const { container, table } = renderFlashing()

		act(() => {
			table.flashCells({ rowIds: ['r1'] })
		})

		expect(flashOf(cellOf(container, 0, 0))).toBe('flash')
		expect(flashOf(cellOf(container, 0, 1))).toBe('flash')
		expect(container.querySelectorAll('[data-flash]')).toHaveLength(2)
	})

	it('flashes a column whose automatic flash is off', () => {
		const { container, table } = renderFlashing()

		act(() => {
			table.flashCells({ columnIds: ['price'] })
		})

		expect(flashOf(cellOf(container, 0, 1))).toBe('flash')
		expect(flashOf(cellOf(container, 1, 1))).toBe('flash')
		expect(container.querySelectorAll('[data-flash]')).toHaveLength(2)
	})

	it('runs with the durations of the call, over the grid ones', () => {
		const { container, table } = renderFlashing({ flashing: { fadeDuration: 300 } })

		act(() => {
			table.flashCells({ rowIds: ['r1'], columnIds: ['price'], flashDuration: 50 })
		})

		const cell = cellOf(container, 0, 1)
		expect(cell.style.getPropertyValue('--dg-flash-fade-duration')).toBe('300ms')
		advance(50)
		expect(flashOf(cell)).toBe('fade')
	})

	it('does not replay a request to a cell mounted after it', () => {
		const { container, table, setData } = renderFlashing()

		act(() => {
			table.flashCells()
		})
		advance(1500)
		setData([...QUOTES, { id: 'r3', symbol: 'CCC', price: 300 }])

		expect(container.querySelectorAll('[data-flash]')).toHaveLength(0)
	})
})

describe('status', () => {
	const statusOf = (cell: HTMLElement): string | null => cell.getAttribute('data-flash-status')

	const byDirection = createColumns<Quote>([
		{ accessorKey: 'symbol', header: 'Symbol' },
		{
			accessorKey: 'price',
			header: 'Price',
			flashing: { status: (previous, next) => (next > previous ? 'success' : 'error') },
		},
	])

	it('paints a manual flash in the status it names', () => {
		const { container, table } = renderFlashing()

		act(() => {
			table.flashCells({ rowIds: ['r1'], status: 'error' })
		})

		expect(statusOf(cellOf(container, 0, 0))).toBe('error')
		expect(statusOf(cellOf(container, 0, 1))).toBe('error')
	})

	it('a manual flash without a status is default, even on a column with a status function', () => {
		const status = vi.fn(() => 'success' as const)
		const columns = createColumns<Quote>([{ accessorKey: 'price', header: 'Price', flashing: { status } }])
		const { container, table } = renderFlashing({ columns })

		act(() => {
			table.flashCells({ columnIds: ['price'] })
		})

		expect(statusOf(cellOf(container, 0, 0))).toBe('default')
		expect(status).not.toHaveBeenCalled()
	})

	it('takes an automatic status from the column function', () => {
		const { container, setData } = renderFlashing({ columns: byDirection })

		setData([
			{ ...R1, price: 101 },
			{ ...R2, price: 199 },
		])

		expect(statusOf(cellOf(container, 0, 1))).toBe('success')
		expect(statusOf(cellOf(container, 1, 1))).toBe('error')
	})

	it('hands the function the previous value, the next one and the row', () => {
		const status = vi.fn(() => undefined)
		const columns = createColumns<Quote>([{ accessorKey: 'price', header: 'Price', flashing: { status } }])
		const { setData } = renderFlashing({ columns })
		const next = { ...R1, price: 101 }

		setData([next, R2])

		expect(status).toHaveBeenCalledTimes(1)
		expect(status).toHaveBeenCalledWith(100, 101, next)
	})

	it('is default for a column without a status function', () => {
		const { container, setData } = renderFlashing({ flashing: true })

		setData([{ ...R1, price: 101 }, R2])

		expect(statusOf(cellOf(container, 0, 1))).toBe('default')
	})

	it('is default when the function returns undefined, and the cell still flashes', () => {
		const columns = createColumns<Quote>([
			{ accessorKey: 'price', header: 'Price', flashing: { status: () => undefined } },
		])
		const { container, setData } = renderFlashing({ columns })

		setData([{ ...R1, price: 101 }, R2])

		expect(flashOf(cellOf(container, 0, 0))).toBe('flash')
		expect(statusOf(cellOf(container, 0, 0))).toBe('default')
	})

	it('does not call the function for a value that did not change', () => {
		const status = vi.fn(() => 'success' as const)
		const columns = createColumns<Quote>([{ accessorKey: 'price', header: 'Price', flashing: { status } }])
		const { container, setData } = renderFlashing({ columns })

		setData([{ ...R1 }, { ...R2 }])

		expect(status).not.toHaveBeenCalled()
		expect(container.querySelectorAll('[data-flash]')).toHaveLength(0)
	})

	it('a change during a flash restarts it in the new status', () => {
		const { container, setData } = renderFlashing({ columns: byDirection })

		setData([{ ...R1, price: 101 }, R2])
		advance(800)
		setData([{ ...R1, price: 99 }, R2])

		expect(flashOf(cellOf(container, 0, 1))).toBe('flash')
		expect(statusOf(cellOf(container, 0, 1))).toBe('error')
	})

	it('leaves with data-flash, through the fade', () => {
		const { container, setData } = renderFlashing({ columns: byDirection })

		setData([{ ...R1, price: 101 }, R2])
		advance(500)
		expect(statusOf(cellOf(container, 0, 1))).toBe('success')
		advance(1000)

		expect(container.querySelectorAll('[data-flash-status]')).toHaveLength(0)
	})
})

import { ACTIONS_COLUMN_ID, createColumns, SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'
import { act, render, renderHook } from '@testing-library/react'
import { StrictMode, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { TEST_FEATURES } from './test-utils'
import { useDataGrid } from './use-data-grid'

import type { DataTable } from './types'
import type { TableState } from '@ez-kit/data-grid-core'
import type { ReactElement } from 'react'

type Row = { id: number; name: string; age: number }

const ROWS: Row[] = [{ id: 1, name: 'Alice', age: 30 }]

const COLUMNS = createColumns<Row>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age' },
])

type GridState = Partial<TableState<typeof TEST_FEATURES>>
type Grid = DataTable<typeof TEST_FEATURES, Row>

function useControlledGrid(
	state: GridState,
	onStateChange?: (next: TableState<typeof TEST_FEATURES>) => void,
	selection = true,
) {
	return useDataGrid({
		features: TEST_FEATURES,
		data: ROWS,
		columns: COLUMNS,
		selection,
		deleting: { onDelete: () => {} },
		ordering: true,
		pinning: { column: true },
		visibility: true,
		state,
		...(onStateChange === undefined ? {} : { onStateChange }),
	})
}

const ids = (columns: { id: string }[]): string[] => columns.map((column) => column.id)

describe('controlled state — the column invariants hold', () => {
	it('keeps the system columns pinned when the pinning slice is empty', () => {
		const { result } = renderHook(() => useControlledGrid({ columnPinning: { start: [], end: [] } }))

		expect(ids(result.current.getStartLeafColumns())).toEqual([SELECTION_COLUMN_ID])
		expect(ids(result.current.getEndLeafColumns())).toEqual([ACTIONS_COLUMN_ID])
	})

	it('keeps a system column visible when the visibility slice hides it', () => {
		const { result } = renderHook(() => useControlledGrid({ columnVisibility: { [ACTIONS_COLUMN_ID]: false } }))

		expect(ids(result.current.getVisibleLeafColumns())).toContain(ACTIONS_COLUMN_ID)
	})

	it('puts the system columns back at the edges of a column order without them', () => {
		const { result } = renderHook(() => useControlledGrid({ columnOrder: ['age', 'name'] }))

		expect(ids(result.current.getAllLeafColumns())).toEqual([SELECTION_COLUMN_ID, 'age', 'name', ACTIONS_COLUMN_ID])
	})

	it('publishes the same slice across renders that pass the same value', () => {
		const pinning = { start: [], end: [] }
		const { result, rerender } = renderHook(() => useControlledGrid({ columnPinning: pinning }))
		const first = result.current.store.state.columnPinning

		rerender()

		expect(result.current.store.state.columnPinning).toBe(first)
	})
})

describe('controlled state — the correction follows the config', () => {
	it('re-corrects the same slice when the config adds a forced column', () => {
		const pinning = { start: [], end: [] }
		const { result, rerender } = renderHook(
			({ selection }: { selection: boolean }) => useControlledGrid({ columnPinning: pinning }, undefined, selection),
			{ initialProps: { selection: false } },
		)
		expect(ids(result.current.getStartLeafColumns())).toEqual([])

		rerender({ selection: true })

		expect(ids(result.current.getStartLeafColumns())).toEqual([SELECTION_COLUMN_ID])
	})

	it('drops a column the config no longer forces from the same slice', () => {
		const order = ['age', 'name']
		const { result, rerender } = renderHook(
			({ selection }: { selection: boolean }) => useControlledGrid({ columnOrder: order }, undefined, selection),
			{ initialProps: { selection: true } },
		)
		expect(result.current.store.state.columnOrder[0]).toBe(SELECTION_COLUMN_ID)

		rerender({ selection: false })

		expect(result.current.store.state.columnOrder).toBe(order)
	})

	it('keeps each corrected slice across renders, visibility and order included', () => {
		const state = { columnOrder: ['age', 'name'], columnVisibility: { [ACTIONS_COLUMN_ID]: false } }
		const { result, rerender } = renderHook(() => useControlledGrid(state))
		const order = result.current.store.state.columnOrder
		const visibility = result.current.store.state.columnVisibility

		rerender()

		expect(result.current.store.state.columnOrder).toBe(order)
		expect(result.current.store.state.columnVisibility).toBe(visibility)
	})
})

describe('controlled state — correcting the consumer’s value is not a change', () => {
	it('does not report the correction, and a mirrored host settles', () => {
		const onStateChange = vi.fn<(next: TableState<typeof TEST_FEATURES>) => void>()
		const onRender = vi.fn<(grid: Grid) => void>()

		function Host({ report }: { report: (grid: Grid) => void }): ReactElement {
			const [state, setState] = useState<GridState>({ columnPinning: { start: [], end: [] } })
			const grid = useControlledGrid(state, (next) => {
				onStateChange(next)
				setState(next)
			})
			report(grid)
			return <span />
		}

		render(
			<StrictMode>
				<Host report={onRender} />
			</StrictMode>,
		)
		const settled = onRender.mock.calls.length
		const grid = onRender.mock.calls.at(-1)?.[0]

		expect(onStateChange).not.toHaveBeenCalled()
		expect(settled).toBeLessThanOrEqual(4)

		act(() => {
			grid?.getColumn('name')?.pin('start')
		})

		expect(onStateChange).toHaveBeenCalledTimes(1)
		expect(onStateChange.mock.calls[0]?.[0].columnPinning.start).toEqual([SELECTION_COLUMN_ID, 'name'])
		expect(onRender.mock.calls.length - settled).toBeLessThanOrEqual(4)
	})

	it('does not report or loop when the host passes a new but equal slice every render', () => {
		const onStateChange = vi.fn()
		const { rerender } = renderHook(() => useControlledGrid({ columnPinning: { start: [], end: [] } }, onStateChange))

		rerender()
		rerender()

		expect(onStateChange).not.toHaveBeenCalled()
	})

	it('does not report a value that already satisfies the invariants', () => {
		const onStateChange = vi.fn()
		const pinning = { start: [SELECTION_COLUMN_ID], end: [ACTIONS_COLUMN_ID] }

		const { result } = renderHook(() => useControlledGrid({ columnPinning: pinning }, onStateChange))

		expect(result.current.store.state.columnPinning).toBe(pinning)
		expect(onStateChange).not.toHaveBeenCalled()
	})
})

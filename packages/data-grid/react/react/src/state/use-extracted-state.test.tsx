import { createColumns, SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'
import { act, renderHook } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TEST_FEATURES } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { useExtractedState } from './use-extracted-state'

import type { PersistableStateKey } from './state-keys'

type Row = { id: number; name: string }
const columns = createColumns<Row>([{ accessorKey: 'name' }])
const data: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

describe('useExtractedState', () => {
	it('returns a referentially stable object across unrelated re-renders', () => {
		const { result, rerender } = renderHook(() => {
			const grid = useDataGrid({ features: TEST_FEATURES, data, columns, sorting: true })
			return useExtractedState(grid, { keys: ['sorting'] })
		})
		const first = result.current
		rerender()
		expect(result.current).toBe(first)
	})

	it('produces a new identity when an included slice changes', () => {
		const { result } = renderHook(() => {
			const grid = useDataGrid({ features: TEST_FEATURES, data, columns, sorting: true })
			const state = useExtractedState(grid, { keys: ['sorting'] })
			return { grid, state }
		})
		const before = result.current.state
		act(() => {
			result.current.grid.setSorting([{ id: 'name', desc: true }])
		})
		expect(result.current.state).not.toBe(before)
		expect(result.current.state.sorting).toEqual([{ id: 'name', desc: true }])
	})

	it('does not change identity when an excluded slice changes', () => {
		const { result } = renderHook(() => {
			const grid = useDataGrid({ features: TEST_FEATURES, data, columns, sorting: true })
			const state = useExtractedState(grid, { keys: ['sorting'] })
			return { grid, state }
		})
		const before = result.current.state
		act(() => {
			result.current.grid.setPageIndex(3)
		})
		expect(result.current.state).toBe(before)
	})

	it('produces a new identity when the keys list changes', () => {
		const { result, rerender } = renderHook(
			({ keys }: { keys: PersistableStateKey[] }) => {
				const grid = useDataGrid({ features: TEST_FEATURES, data, columns, sorting: true })
				return useExtractedState(grid, { keys })
			},
			{ initialProps: { keys: ['sorting'] as PersistableStateKey[] } },
		)
		const before = result.current
		rerender({ keys: ['sorting', 'pagination'] as PersistableStateKey[] })
		expect(result.current).not.toBe(before)
		expect(result.current).toHaveProperty('pagination')
	})

	it('renders on the server without throwing and reflects seeded state', () => {
		function Seeded() {
			const grid = useDataGrid({
				features: TEST_FEATURES,
				data,
				columns,
				sorting: true,
				initialState: { sorting: [{ id: 'name', desc: true }] },
			})
			const state = useExtractedState(grid, { keys: ['sorting'] })
			return <pre>{JSON.stringify(state)}</pre>
		}

		const markup = renderToStaticMarkup(<Seeded />)
		expect(markup).toContain('&quot;name&quot;')
		expect(markup).toContain('&quot;desc&quot;:true')
	})
})

describe('useExtractedState — without the columns the config places', () => {
	function useSelectableGrid() {
		const grid = useDataGrid({
			features: TEST_FEATURES,
			data,
			columns,
			selection: true,
			pinning: { column: true },
		})
		return { grid, state: useExtractedState(grid) }
	}

	it('keeps its identity across re-renders although the stripped value is rebuilt', () => {
		const { result, rerender } = renderHook(useSelectableGrid)
		const first = result.current.state

		rerender()

		expect(first.columnPinning).toEqual({ start: [], end: [] })
		expect(result.current.state).toBe(first)
	})

	it('strips again when the config starts forcing a column the store already holds', () => {
		const { result, rerender } = renderHook(
			({ forced }: { forced: boolean }) => {
				const grid = useDataGrid({
					features: TEST_FEATURES,
					data,
					columns: createColumns<Row>([{ accessorKey: 'name', ...(forced ? { pinning: 'start' as const } : {}) }]),
					pinning: { column: true },
				})
				return { grid, state: useExtractedState(grid) }
			},
			{ initialProps: { forced: false } },
		)
		act(() => {
			result.current.grid.getColumn('name')?.pin('start')
		})
		expect(result.current.state.columnPinning?.start).toEqual(['name'])

		rerender({ forced: true })

		expect(result.current.state.columnPinning?.start).toEqual([])
	})

	it('reports a pin the user made, without the forced columns', () => {
		const { result } = renderHook(useSelectableGrid)
		const before = result.current.state

		act(() => {
			result.current.grid.getColumn('name')?.pin('start')
		})

		expect(result.current.state).not.toBe(before)
		expect(result.current.state.columnPinning).toEqual({ start: ['name'], end: [] })
		expect(result.current.grid.store.state.columnPinning.start).toEqual([SELECTION_COLUMN_ID, 'name'])
	})
})

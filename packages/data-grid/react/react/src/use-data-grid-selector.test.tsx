import { createTable } from '@ez-kit/data-grid-core'
import { act, render, renderHook } from '@testing-library/react'
import { StrictMode, useRef } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { prepareDataGridTable } from './prepare-table'
import { TEST_FEATURES } from './test-utils'
import { useDataGridSelector } from './use-data-grid-selector'

import type { DataTable, GridFeatures } from './types'

type Row = { id: string; name: string; age: number }

function makeTable(initial: Row[] = [{ id: '1', name: 'a', age: 20 }]): DataTable<GridFeatures, Row> {
	const table = createTable<GridFeatures, Row>({
		features: TEST_FEATURES,
		data: initial,
		columns: [
			{ accessorKey: 'name', header: 'Name' },
			{ accessorKey: 'age', header: 'Age' },
		],
	})
	return prepareDataGridTable(table)
}

describe('useDataGridSelector', () => {
	it('returns the current slice from table state', () => {
		const table = makeTable()

		const { result } = renderHook(() => useDataGridSelector(table, (s) => s.sorting))

		expect(result.current).toEqual([])
	})

	it('re-renders when the selected slice changes', () => {
		const table = makeTable()
		let renderCount = 0
		const { result } = renderHook(() => {
			renderCount++
			return useDataGridSelector(table, (s) => s.sorting)
		})
		const baseline = renderCount

		act(() => {
			table.setSorting([{ id: 'name', desc: false }])
		})

		expect(renderCount).toBeGreaterThan(baseline)
		expect(result.current).toEqual([{ id: 'name', desc: false }])
	})

	it('does NOT re-render when an unrelated slice changes', () => {
		const table = makeTable()
		let renderCount = 0
		renderHook(() => {
			renderCount++
			return useDataGridSelector(table, (s) => s.sorting)
		})
		const baseline = renderCount

		act(() => {
			table.setGlobalFilter('whatever')
		})

		expect(renderCount).toBe(baseline)
	})

	it('two independent selectors on the same table update independently', () => {
		const table = makeTable()
		let sortingRenders = 0
		let filterRenders = 0
		renderHook(() => {
			sortingRenders++
			return useDataGridSelector(table, (s) => s.sorting)
		})
		renderHook(() => {
			filterRenders++
			return useDataGridSelector(table, (s) => s.columnFilters.length)
		})
		const sortingBaseline = sortingRenders
		const filterBaseline = filterRenders

		act(() => {
			table.setSorting([{ id: 'name', desc: true }])
		})

		expect(sortingRenders).toBeGreaterThan(sortingBaseline)
		expect(filterRenders).toBe(filterBaseline)
	})

	it('survives StrictMode double-mount without losing subscription', () => {
		const table = makeTable()
		let renderCount = 0
		const { result } = renderHook(
			() => {
				renderCount++
				return useDataGridSelector(table, (s) => s.sorting)
			},
			{ wrapper: ({ children }) => <StrictMode>{children}</StrictMode> },
		)
		expect(result.current).toEqual([])

		act(() => {
			table.setSorting([{ id: 'age', desc: false }])
		})

		expect(result.current).toEqual([{ id: 'age', desc: false }])
		expect(renderCount).toBeGreaterThan(0)
	})

	it('renders on the server, reading the same getter the client does', () => {
		const table = makeTable()

		function ServerView() {
			const sorting = useDataGridSelector(table, (s) => s.sorting)
			return <span data-testid='ssr'>{JSON.stringify(sorting)}</span>
		}

		const html = renderToString(<ServerView />)
		expect(html).toContain('[]')
	})

	it('the server read is the live state, and the frozen one is table.initialState', () => {
		const table = makeTable()
		table.setSorting([{ id: 'name', desc: false }])

		function ServerView() {
			const sorting = useDataGridSelector(table, (s) => s.sorting)
			return <span>{JSON.stringify(sorting)}</span>
		}

		// v8's `getInitialSnapshot` was this hook's `getServerSnapshot`, and a table mutated
		// before mount still rendered `[]` on the server. v9 deleted it, and this hook now hands
		// `table.store.state` to both arguments — as upstream's own `useSelector` does — so the
		// server sees what the client sees.
		// `renderToString` escapes the quotes of the JSON text node.
		expect(renderToString(<ServerView />)).toContain('&quot;name&quot;')
		// The frozen value did not disappear; it moved. `initialState` is resolved once at
		// construction and never reassigned, so it is what to pass if a frozen read is wanted.
		expect(table.initialState.sorting).toEqual([])
	})

	it('latest selector wins when selector identity changes across renders', () => {
		const table = makeTable()
		const Probe = ({ which }: { which: 'sorting' | 'filter' }) => {
			const value = useDataGridSelector(table, (s) => (which === 'sorting' ? s.sorting.length : s.columnFilters.length))
			return <span data-testid='value'>{value}</span>
		}

		const { rerender, getByTestId } = render(<Probe which='sorting' />)
		expect(getByTestId('value').textContent).toBe('0')

		act(() => {
			table.setSorting([{ id: 'name', desc: false }])
		})
		expect(getByTestId('value').textContent).toBe('1')

		rerender(<Probe which='filter' />)
		expect(getByTestId('value').textContent).toBe('0')
	})

	it('component re-render alone does not trigger an extra subscribe', () => {
		const table = makeTable()
		const subscribeSpy = vi.spyOn(table.store, 'subscribe')

		const Probe = () => {
			useRef(0).current++ // ensure a hook before our hook
			useDataGridSelector(table, (s) => s.sorting)
			return null
		}

		const { rerender } = render(<Probe />)
		const initial = subscribeSpy.mock.calls.length

		rerender(<Probe />)

		expect(subscribeSpy.mock.calls.length).toBe(initial)
		subscribeSpy.mockRestore()
	})
})

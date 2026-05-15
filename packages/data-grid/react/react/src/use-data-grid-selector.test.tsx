import { createTable } from '@ez-kit/data-grid-core'
import { act, render, renderHook } from '@testing-library/react'
import { StrictMode, useRef } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { createDataGridInstance } from './data-grid-instance'
import { useDataGridSelector } from './use-data-grid-selector'

import type { DataGridInstance } from './data-grid-instance'

type Row = { id: string; name: string; age: number }

function makeInstance(initial: Row[] = [{ id: '1', name: 'a', age: 20 }]): DataGridInstance<Row> {
	const table = createTable<Row>({
		data: initial,
		columns: [
			{ accessorKey: 'name', header: 'Name' },
			{ accessorKey: 'age', header: 'Age' },
		],
	})
	return createDataGridInstance(table)
}

describe('useDataGridSelector', () => {
	it('returns the current slice from table state', () => {
		const instance = makeInstance()

		const { result } = renderHook(() => useDataGridSelector(instance, (s) => s.sorting))

		expect(result.current).toEqual([])
	})

	it('re-renders when the selected slice changes', () => {
		const instance = makeInstance()
		let renderCount = 0
		const { result } = renderHook(() => {
			renderCount++
			return useDataGridSelector(instance, (s) => s.sorting)
		})
		const baseline = renderCount

		act(() => {
			instance.table.setState((prev) => ({ ...prev, sorting: [{ id: 'name', desc: false }] }))
		})

		expect(renderCount).toBeGreaterThan(baseline)
		expect(result.current).toEqual([{ id: 'name', desc: false }])
	})

	it('does NOT re-render when an unrelated slice changes', () => {
		const instance = makeInstance()
		let renderCount = 0
		renderHook(() => {
			renderCount++
			return useDataGridSelector(instance, (s) => s.sorting)
		})
		const baseline = renderCount

		act(() => {
			instance.table.setState((prev) => ({ ...prev, globalFilter: 'whatever' }))
		})

		expect(renderCount).toBe(baseline)
	})

	it('two independent selectors on the same instance update independently', () => {
		const instance = makeInstance()
		let sortingRenders = 0
		let filterRenders = 0
		renderHook(() => {
			sortingRenders++
			return useDataGridSelector(instance, (s) => s.sorting)
		})
		renderHook(() => {
			filterRenders++
			return useDataGridSelector(instance, (s) => s.columnFilters.length)
		})
		const sortingBaseline = sortingRenders
		const filterBaseline = filterRenders

		act(() => {
			instance.table.setState((prev) => ({ ...prev, sorting: [{ id: 'name', desc: true }] }))
		})

		expect(sortingRenders).toBeGreaterThan(sortingBaseline)
		expect(filterRenders).toBe(filterBaseline)
	})

	it('survives StrictMode double-mount without losing subscription', () => {
		const instance = makeInstance()
		let renderCount = 0
		const { result } = renderHook(
			() => {
				renderCount++
				return useDataGridSelector(instance, (s) => s.sorting)
			},
			{ wrapper: ({ children }) => <StrictMode>{children}</StrictMode> },
		)
		expect(result.current).toEqual([])

		act(() => {
			instance.table.setState((prev) => ({ ...prev, sorting: [{ id: 'age', desc: false }] }))
		})

		expect(result.current).toEqual([{ id: 'age', desc: false }])
		expect(renderCount).toBeGreaterThan(0)
	})

	it('renders deterministically via getServerSnapshot in SSR', () => {
		const instance = makeInstance()

		function ServerView() {
			const sorting = useDataGridSelector(instance, (s) => s.sorting)
			return <span data-testid='ssr'>{JSON.stringify(sorting)}</span>
		}

		const html = renderToString(<ServerView />)
		expect(html).toContain('[]')
	})

	it('mutating the table BEFORE mount does not corrupt the SSR snapshot', () => {
		const instance = makeInstance()
		instance.table.setState((prev) => ({ ...prev, sorting: [{ id: 'name', desc: false }] }))

		function ServerView() {
			const sorting = useDataGridSelector(instance, (s) => s.sorting)
			return <span>{JSON.stringify(sorting)}</span>
		}

		// getServerSnapshot returns the initial-frozen state, so SSR sees an empty
		// sort even after the table was mutated.
		const html = renderToString(<ServerView />)
		expect(html).toContain('[]')
	})

	it('latest selector wins when selector identity changes across renders', () => {
		const instance = makeInstance()
		const Probe = ({ which }: { which: 'sorting' | 'filter' }) => {
			const value = useDataGridSelector(instance, (s) =>
				which === 'sorting' ? s.sorting.length : s.columnFilters.length,
			)
			return <span data-testid='value'>{value}</span>
		}

		const { rerender, getByTestId } = render(<Probe which='sorting' />)
		expect(getByTestId('value').textContent).toBe('0')

		act(() => {
			instance.table.setState((prev) => ({ ...prev, sorting: [{ id: 'name', desc: false }] }))
		})
		expect(getByTestId('value').textContent).toBe('1')

		rerender(<Probe which='filter' />)
		expect(getByTestId('value').textContent).toBe('0')
	})

	it('component re-render alone does not trigger an extra subscribe', () => {
		const instance = makeInstance()
		const subscribeSpy = vi.spyOn(instance.store, 'subscribe')

		const Probe = () => {
			useRef(0).current++ // ensure a hook before our hook
			useDataGridSelector(instance, (s) => s.sorting)
			return null
		}

		const { rerender } = render(<Probe />)
		const initial = subscribeSpy.mock.calls.length

		rerender(<Probe />)

		expect(subscribeSpy.mock.calls.length).toBe(initial)
		subscribeSpy.mockRestore()
	})
})

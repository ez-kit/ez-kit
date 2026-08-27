import { createColumns } from '@ez-kit/data-grid-core'
import { act, renderHook } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

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
			const grid = useDataGrid({ data, columns, sorting: true })
			return useExtractedState(grid, { keys: ['sorting'] })
		})
		const first = result.current
		rerender()
		expect(result.current).toBe(first)
	})

	it('produces a new identity when an included slice changes', () => {
		const { result } = renderHook(() => {
			const grid = useDataGrid({ data, columns, sorting: true })
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
			const grid = useDataGrid({ data, columns, sorting: true })
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
				const grid = useDataGrid({ data, columns, sorting: true })
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

import { defineColumns } from '@ez-kit/data-grid-core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useDataGrid } from '../use-data-grid'

import { useExtractedState } from './use-extracted-state'

type Row = { id: number; name: string }
const columns = defineColumns<Row>([{ accessorKey: 'name' }])
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
			result.current.grid.table.setSorting([{ id: 'name', desc: true }])
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
			result.current.grid.table.setPageIndex(3)
		})
		expect(result.current.state).toBe(before)
	})
})

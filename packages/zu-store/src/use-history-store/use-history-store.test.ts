import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { withHistory } from '../middlewares/with-history'

import { useHistoryStore } from './index'

type PaintState = {
	color: string
}

function makeStore() {
	return withHistory(createStore<PaintState>()(() => ({ color: 'red' })))
}

describe('useHistoryStore', () => {
	it('returns full history state without a selector', () => {
		const store = makeStore()
		const { result } = renderHook(() => useHistoryStore(store))
		expect(result.current.pasts).toEqual([])
		expect(result.current.futures).toEqual([])
		expect(result.current.isPaused).toBe(false)
	})

	it('returns selected slice when a selector is provided', () => {
		const store = makeStore()
		const { result } = renderHook(() => useHistoryStore(store, (s) => s.pasts))
		expect(result.current).toEqual([])
	})

	it('re-renders when history state changes after setState', () => {
		const store = makeStore()
		const { result } = renderHook(() => useHistoryStore(store, (s) => s.pasts))

		act(() => {
			store.setState({ color: 'blue' })
		})

		expect(result.current).toHaveLength(1)
	})

	it('reflects canUndo as a derived selector', () => {
		const store = makeStore()
		const { result } = renderHook(() => useHistoryStore(store, (s) => s.pasts.length > 0))

		expect(result.current).toBe(false)

		act(() => {
			store.setState({ color: 'blue' })
		})

		expect(result.current).toBe(true)
	})

	it('exposes undo and reflects change in state', () => {
		const store = makeStore()
		store.setState({ color: 'blue' })

		const { result } = renderHook(() => useHistoryStore(store))

		act(() => {
			result.current.undo()
		})

		expect(store.getState().color).toBe('red')
		expect(result.current.pasts).toHaveLength(0)
	})
})

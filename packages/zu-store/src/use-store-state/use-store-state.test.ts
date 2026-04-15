import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand'

import { useStoreState } from './index'

interface CounterState {
	count: number
	label: string
	active: boolean
}

function makeStore(initial: CounterState = { count: 5, label: 'hello', active: true }) {
	return createStore<CounterState>()(() => initial)
}

describe('useStoreState', () => {
	it('reads the initial numeric value by key', () => {
		const store = makeStore()
		const { result } = renderHook(() => useStoreState(store, 'count'))

		expect(result.current[0]).toBe(5)
	})

	it('reads the initial string value by key', () => {
		const store = makeStore()
		const { result } = renderHook(() => useStoreState(store, 'label'))

		expect(result.current[0]).toBe('hello')
	})

	it('reads the initial boolean value by key', () => {
		const store = makeStore()
		const { result } = renderHook(() => useStoreState(store, 'active'))

		expect(result.current[0]).toBe(true)
	})

	it('setValue updates the field and re-renders', () => {
		const store = makeStore()
		const { result } = renderHook(() => useStoreState(store, 'count'))

		act(() => {
			result.current[1](42)
		})

		expect(result.current[0]).toBe(42)
	})

	it('setValue does not affect other fields', () => {
		const store = makeStore()
		const { result } = renderHook(() => useStoreState(store, 'count'))

		act(() => {
			result.current[1](99)
		})

		expect(store.getState().label).toBe('hello')
		expect(store.getState().active).toBe(true)
	})

	it('does not re-render when a different field changes', () => {
		const store = makeStore()
		const renderSpy = vi.fn()

		renderHook(() => {
			renderSpy()
			return useStoreState(store, 'count')
		})

		const initialRenderCount = renderSpy.mock.calls.length

		act(() => {
			store.setState({ label: 'changed' })
		})

		expect(renderSpy.mock.calls.length).toBe(initialRenderCount)
	})
})

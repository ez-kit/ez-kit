import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFilterInput } from './use-filter-input'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('filter input lifecycle', () => {
	it('does not commit on mount or Strict Mode effect replay', () => {
		const onCommit = vi.fn()
		renderHook(() => useFilterInput({ value: 'seed', debounce: 300, onCommit }), { wrapper: StrictMode })
		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(onCommit).not.toHaveBeenCalled()
	})

	it('cancels a pending commit on unmount', () => {
		const onCommit = vi.fn()
		const { result, unmount } = renderHook(() => useFilterInput({ value: '', debounce: 300, onCommit }))
		act(() => {
			result.current.onChange('Ann')
		})
		unmount()
		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(onCommit).not.toHaveBeenCalled()
	})

	it('uses the current callback without restarting the edit deadline', () => {
		const first = vi.fn()
		const second = vi.fn()
		const { result, rerender } = renderHook(({ onCommit }) => useFilterInput({ value: '', debounce: 300, onCommit }), {
			initialProps: { onCommit: first },
		})
		act(() => {
			result.current.onChange('Ann')
		})
		act(() => {
			vi.advanceTimersByTime(200)
		})
		rerender({ onCommit: second })
		act(() => {
			vi.advanceTimersByTime(100)
		})
		expect(first).not.toHaveBeenCalled()
		expect(second).toHaveBeenCalledExactlyOnceWith('Ann')
	})

	it('replaces pending input when the controlled value changes externally', () => {
		const onCommit = vi.fn()
		const { result, rerender } = renderHook(({ value }) => useFilterInput({ value, debounce: 300, onCommit }), {
			initialProps: { value: '' },
		})
		act(() => {
			result.current.onChange('Ann')
		})
		rerender({ value: 'Bob' })
		expect(result.current.value).toBe('Bob')
		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(onCommit).not.toHaveBeenCalled()
	})

	it('preserves newer typing when an earlier commit echoes through controlled props', () => {
		const onCommit = vi.fn()
		const { result, rerender } = renderHook(({ value }) => useFilterInput({ value, debounce: 300, onCommit }), {
			initialProps: { value: '' },
		})
		act(() => {
			result.current.onChange('A')
		})
		act(() => {
			vi.advanceTimersByTime(300)
		})
		act(() => {
			result.current.onChange('Ann')
		})
		rerender({ value: 'A' })
		expect(result.current.value).toBe('Ann')
		act(() => {
			vi.advanceTimersByTime(300)
		})
		expect(onCommit.mock.calls).toEqual([['A'], ['Ann']])
	})

	it('cancels the old edit even when a new target has the same stored value', () => {
		const onCommit = vi.fn()
		const { result, rerender } = renderHook(
			({ context }) => useFilterInput({ value: '', context, debounce: 300, onCommit }),
			{ initialProps: { context: 'one' } },
		)
		act(() => {
			result.current.onChange('Ann')
		})
		rerender({ context: 'two' })
		expect(result.current.value).toBe('')
		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(onCommit).not.toHaveBeenCalled()
	})

	it('commits pending input immediately when delay becomes zero', () => {
		const onCommit = vi.fn()
		const { result, rerender } = renderHook(({ debounce }) => useFilterInput({ value: '', debounce, onCommit }), {
			initialProps: { debounce: 300 },
		})
		act(() => {
			result.current.onChange('Ann')
		})
		rerender({ debounce: 0 })
		expect(onCommit).toHaveBeenCalledExactlyOnceWith('Ann')
		act(() => {
			vi.advanceTimersByTime(1000)
		})
		expect(onCommit).toHaveBeenCalledTimes(1)
	})
})

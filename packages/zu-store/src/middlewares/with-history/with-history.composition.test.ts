import { describe, expect, it, vi } from 'vitest'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'

import { withHistory } from './index'

type CounterState = {
	count: number
	inc: () => void
}

describe('withHistory composition — subscribeWithSelector', () => {
	it('selective subscribe receives only the slice change', () => {
		const store = createStore<CounterState>()(
			subscribeWithSelector(
				withHistory((set) => ({
					count: 0,
					inc: () => {
						set((s) => ({ count: s.count + 1 }))
					},
				})),
			),
		)
		const listener = vi.fn()
		const unsub = store.subscribe((s) => s.count, listener)
		store.getState().inc()
		expect(listener).toHaveBeenCalledTimes(1)
		expect(listener).toHaveBeenCalledWith(1, 0)
		expect(store.history.getState().pasts.length).toBe(1)
		unsub()
	})

	it('history is still reachable through the composed StoreApi', () => {
		const store = createStore<CounterState>()(
			subscribeWithSelector(
				withHistory((set) => ({
					count: 0,
					inc: () => {
						set((s) => ({ count: s.count + 1 }))
					},
				})),
			),
		)
		expect(typeof store.history.getState).toBe('function')
		expect(typeof store.history.getState().undo).toBe('function')
	})

	it('undo through composed subscribeWithSelector still restores state', () => {
		const store = createStore<CounterState>()(
			subscribeWithSelector(
				withHistory((set) => ({
					count: 0,
					inc: () => {
						set((s) => ({ count: s.count + 1 }))
					},
				})),
			),
		)
		store.getState().inc()
		store.getState().inc()
		expect(store.getState().count).toBe(2)
		store.history.getState().undo()
		expect(store.getState().count).toBe(1)
	})
})

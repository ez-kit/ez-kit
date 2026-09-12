/**
 * @vitest-environment node
 *
 * The history middleware is pure store wiring — no subscription, no `window`. A store built during a
 * server render must therefore come out with the same shape it has in the browser, so the markup a
 * component renders from `store.history` on the server matches what it renders after hydration.
 */
import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { withHistory } from './with-history'

describe('withHistory on the server', () => {
	it('has no window', () => {
		expect(typeof window).toBe('undefined')
	})

	it('attaches the history sub-store with empty stacks', () => {
		const store = createStore<{ count: number }>()(withHistory(() => ({ count: 0 })))

		expect(store.history.getState().pasts).toEqual([])
		expect(store.history.getState().futures).toEqual([])
		expect(typeof store.history.getState().undo).toBe('function')
	})

	it('records a write made during a server render like any other', () => {
		const store = createStore<{ count: number }>()(withHistory(() => ({ count: 0 })))

		store.setState({ count: 1 })

		expect(store.getState().count).toBe(1)
		expect(store.history.getState().pasts).toEqual([{ count: 0 }])
	})
})

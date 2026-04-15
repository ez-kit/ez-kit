import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { withHistory } from './index'

interface PaintState {
	color: string
	size: number
}

function makeStore(initial: PaintState = { color: 'red', size: 10 }) {
	return withHistory(createStore<PaintState>()(() => initial))
}

describe('withHistory', () => {
	describe('initial state', () => {
		it('preserves the original store state', () => {
			const store = makeStore()
			expect(store.getState()).toEqual({ color: 'red', size: 10 })
		})

		it('adds history.pasts as empty array', () => {
			const store = makeStore()
			expect(store.history.getState().pasts).toEqual([])
		})

		it('adds history.futures as empty array', () => {
			const store = makeStore()
			expect(store.history.getState().futures).toEqual([])
		})

		it('uses default limit of 100', () => {
			const store = makeStore()
			expect(store.history.getState().limit).toBe(100)
		})

		it('respects custom limit option', () => {
			const store = withHistory(createStore<PaintState>()(() => ({ color: 'red', size: 10 })), { limit: 5 })
			expect(store.history.getState().limit).toBe(5)
		})

		it('is not paused by default', () => {
			const store = makeStore()
			expect(store.history.getState().isPaused).toBe(false)
		})

		it('respects defaultPaused: true option', () => {
			const store = withHistory(createStore<PaintState>()(() => ({ color: 'red', size: 10 })), {
				defaultPaused: true,
			})
			expect(store.history.getState().isPaused).toBe(true)
		})

		it('initialises pasts from defaultPasts', () => {
			const past: PaintState = { color: 'blue', size: 5 }
			const store = withHistory(createStore<PaintState>()(() => ({ color: 'red', size: 10 })), {
				defaultPasts: [past],
			})
			expect(store.history.getState().pasts).toEqual([past])
		})

		it('initialises futures from defaultFutures', () => {
			const future: PaintState = { color: 'green', size: 20 }
			const store = withHistory(createStore<PaintState>()(() => ({ color: 'red', size: 10 })), {
				defaultFutures: [future],
			})
			expect(store.history.getState().futures).toEqual([future])
		})

		it('defaultPasts respects the limit option', () => {
			const pasts: PaintState[] = [
				{ color: 'a', size: 1 },
				{ color: 'b', size: 2 },
				{ color: 'c', size: 3 },
			]
			const store = withHistory(createStore<PaintState>()(() => ({ color: 'red', size: 10 })), {
				defaultPasts: pasts,
				limit: 2,
			})
			expect(store.history.getState().pasts).toHaveLength(2)
			expect(store.history.getState().pasts).toEqual([{ color: 'b', size: 2 }, { color: 'c', size: 3 }])
		})

		it('undo works with defaultPasts pre-populated', () => {
			const past: PaintState = { color: 'blue', size: 5 }
			const store = withHistory(createStore<PaintState>()(() => ({ color: 'red', size: 10 })), {
				defaultPasts: [past],
			})
			store.history.getState().undo()
			expect(store.getState()).toEqual(past)
		})

		it('redo works with defaultFutures pre-populated', () => {
			const future: PaintState = { color: 'green', size: 20 }
			const store = withHistory(createStore<PaintState>()(() => ({ color: 'red', size: 10 })), {
				defaultFutures: [future],
			})
			store.history.getState().redo()
			expect(store.getState()).toEqual(future)
		})
	})

	describe('setState recording', () => {
		it('pushes current state to pasts before updating', () => {
			const store = makeStore()
			store.setState({ color: 'blue' })
			expect(store.history.getState().pasts).toEqual([{ color: 'red', size: 10 }])
		})

		it('clears futures when a new change is made', () => {
			const store = makeStore()
			store.setState({ color: 'blue' })
			store.setState({ color: 'green' })
			store.history.getState().undo()
			store.setState({ color: 'yellow' })
			expect(store.history.getState().futures).toEqual([])
		})

		it('caps pasts at the configured limit', () => {
			const store = withHistory(createStore<PaintState>()(() => ({ color: 'red', size: 10 })), { limit: 2 })
			store.setState({ color: 'blue' })
			store.setState({ color: 'green' })
			store.setState({ color: 'purple' })
			expect(store.history.getState().pasts).toHaveLength(2)
		})

		it('does not push to pasts when skipHistory is true', () => {
			const store = makeStore()
			store.setState({ color: 'blue' }, undefined, { skipHistory: true })
			expect(store.history.getState().pasts).toEqual([])
		})

		it('does not push to pasts when paused', () => {
			const store = makeStore()
			store.history.getState().pause()
			store.setState({ color: 'blue' })
			expect(store.history.getState().pasts).toEqual([])
		})
	})

	describe('set convenience method', () => {
		it('updates store state', () => {
			const store = makeStore()
			store.set({ color: 'blue' })
			expect(store.getState().color).toBe('blue')
		})

		it('records current state in pasts', () => {
			const store = makeStore()
			store.set({ color: 'blue' })
			expect(store.history.getState().pasts).toHaveLength(1)
		})

		it('respects skipHistory option', () => {
			const store = makeStore()
			store.set({ color: 'blue' }, { skipHistory: true })
			expect(store.history.getState().pasts).toHaveLength(0)
		})

		it('accepts a function updater', () => {
			const store = makeStore()
			store.set((s) => ({ size: s.size + 5 }))
			expect(store.getState().size).toBe(15)
			expect(store.history.getState().pasts).toHaveLength(1)
		})
	})

	describe('undo', () => {
		it('restores the previous state', () => {
			const store = makeStore()
			store.setState({ color: 'blue' })
			store.history.getState().undo()
			expect(store.getState().color).toBe('red')
		})

		it('pushes the undone state into futures', () => {
			const store = makeStore()
			store.setState({ color: 'blue' })
			store.history.getState().undo()
			expect(store.history.getState().futures).toEqual([{ color: 'blue', size: 10 }])
		})

		it('removes the restored state from pasts', () => {
			const store = makeStore()
			store.setState({ color: 'blue' })
			store.history.getState().undo()
			expect(store.history.getState().pasts).toHaveLength(0)
		})

		it('does nothing when pasts is empty', () => {
			const store = makeStore()
			expect(() => {
				store.history.getState().undo()
			}).not.toThrow()
			expect(store.getState()).toEqual({ color: 'red', size: 10 })
		})

		it('does not grow pasts when undoing', () => {
			const store = makeStore()
			store.setState({ color: 'blue' })
			store.history.getState().undo()
			expect(store.history.getState().pasts).toHaveLength(0)
		})
	})

	describe('redo', () => {
		it('restores the next future state', () => {
			const store = makeStore()
			store.setState({ color: 'blue' })
			store.history.getState().undo()
			store.history.getState().redo()
			expect(store.getState().color).toBe('blue')
		})

		it('pushes the current state back into pasts on redo', () => {
			const store = makeStore()
			store.setState({ color: 'blue' })
			store.history.getState().undo()
			store.history.getState().redo()
			expect(store.history.getState().pasts).toEqual([{ color: 'red', size: 10 }])
		})

		it('removes the restored state from futures', () => {
			const store = makeStore()
			store.setState({ color: 'blue' })
			store.history.getState().undo()
			store.history.getState().redo()
			expect(store.history.getState().futures).toHaveLength(0)
		})

		it('does nothing when futures is empty', () => {
			const store = makeStore()
			expect(() => {
				store.history.getState().redo()
			}).not.toThrow()
			expect(store.getState()).toEqual({ color: 'red', size: 10 })
		})

		it('does not grow futures when redoing', () => {
			const store = makeStore()
			store.setState({ color: 'blue' })
			store.history.getState().undo()
			store.history.getState().redo()
			expect(store.history.getState().futures).toHaveLength(0)
		})
	})

	describe('clear', () => {
		it('empties pasts', () => {
			const store = makeStore()
			store.setState({ color: 'blue' })
			store.history.getState().clear()
			expect(store.history.getState().pasts).toHaveLength(0)
		})

		it('empties futures', () => {
			const store = makeStore()
			store.setState({ color: 'blue' })
			store.history.getState().undo()
			store.history.getState().clear()
			expect(store.history.getState().futures).toHaveLength(0)
		})

		it('does not change the current store state', () => {
			const store = makeStore()
			store.setState({ color: 'blue' })
			store.history.getState().clear()
			expect(store.getState().color).toBe('blue')
		})
	})

	describe('pause and resume', () => {
		it('pause() sets isPaused to true', () => {
			const store = makeStore()
			store.history.getState().pause()
			expect(store.history.getState().isPaused).toBe(true)
		})

		it('resume() sets isPaused to false', () => {
			const store = makeStore()
			store.history.getState().pause()
			store.history.getState().resume()
			expect(store.history.getState().isPaused).toBe(false)
		})

		it('does not record changes while paused', () => {
			const store = makeStore()
			store.history.getState().pause()
			store.setState({ color: 'blue' })
			store.setState({ color: 'green' })
			expect(store.history.getState().pasts).toHaveLength(0)
		})

		it('records changes after resume()', () => {
			const store = makeStore()
			store.history.getState().pause()
			store.setState({ color: 'blue' })
			store.history.getState().resume()
			store.setState({ color: 'green' })
			expect(store.history.getState().pasts).toHaveLength(1)
		})
	})

	describe('shouldPush option', () => {
		it('skips recording when shouldPush returns false', () => {
			const store = withHistory(createStore<PaintState>()(() => ({ color: 'red', size: 10 })), {
				shouldPush: (_prev, next) => next.color !== 'red',
			})
			store.setState({ size: 20 })
			expect(store.history.getState().pasts).toHaveLength(0)
		})

		it('records when shouldPush returns true', () => {
			const store = withHistory(createStore<PaintState>()(() => ({ color: 'red', size: 10 })), {
				shouldPush: (_prev, next) => next.color !== 'red',
			})
			store.setState({ color: 'blue' })
			expect(store.history.getState().pasts).toHaveLength(1)
		})
	})
})

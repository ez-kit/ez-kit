import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { withHistory } from './index'

type PaintState = {
	color: string
	size: number
}

const makePaintStore = (initial: PaintState = { color: 'red', size: 10 }) =>
	createStore<PaintState>()(withHistory(() => initial))

type CounterState = {
	count: number
	inc: () => void
	incBy: (n: number) => void
	silentInc: () => void
}

describe('withHistory — middleware composition', () => {
	it('returns a store with `getState` / `setState` / `subscribe` like any Zustand store', () => {
		const store = makePaintStore()
		expect(typeof store.getState).toBe('function')
		expect(typeof store.setState).toBe('function')
		expect(typeof store.subscribe).toBe('function')
	})

	it('exposes a `history` sub-store on the StoreApi', () => {
		const store = makePaintStore()
		expect(typeof store.history.getState).toBe('function')
		expect(typeof store.history.subscribe).toBe('function')
		expect(store.history.getState().pasts).toEqual([])
		expect(store.history.getState().futures).toEqual([])
	})
})

describe('withHistory — records writes performed through setState', () => {
	it('pushes previous state to pasts on single setState', () => {
		const store = makePaintStore()
		store.setState({ color: 'blue' })
		expect(store.history.getState().pasts).toEqual([{ color: 'red', size: 10 }])
	})

	it('records each setState in chronological order', () => {
		const store = makePaintStore()
		store.setState({ color: 'blue' })
		store.setState({ color: 'green' })
		expect(store.history.getState().pasts).toEqual([
			{ color: 'red', size: 10 },
			{ color: 'blue', size: 10 },
		])
	})

	it('replace=true setState records previous state', () => {
		const store = makePaintStore()
		store.setState({ color: 'blue', size: 20 }, true)
		expect(store.getState()).toEqual({ color: 'blue', size: 20 })
		expect(store.history.getState().pasts).toEqual([{ color: 'red', size: 10 }])
	})

	it('clears futures when a new write arrives after an undo', () => {
		const store = makePaintStore()
		store.setState({ color: 'blue' })
		store.setState({ color: 'green' })
		store.history.getState().undo()
		expect(store.history.getState().futures.length).toBe(1)
		store.setState({ color: 'yellow' })
		expect(store.history.getState().futures).toEqual([])
	})
})

describe('withHistory — records writes performed from inside actions', () => {
	const makeCounter = () =>
		createStore<CounterState>()(
			withHistory((set, _get, api) => ({
				count: 0,
				inc: () => {
					set((s) => ({ count: s.count + 1 }))
				},
				incBy: (n: number) => {
					set((s) => ({ count: s.count + n }))
				},
				silentInc: () => {
					api.history.getState().skip(() => {
						set((s) => ({ count: s.count + 1 }))
					})
				},
			})),
		)

	it('records when an action uses the wrapped set with a partial object', () => {
		const store = createStore<CounterState>()(
			withHistory((set) => ({
				count: 0,
				inc: () => {
					set({ count: 1 })
				},
				incBy: () => {},
				silentInc: () => {},
			})),
		)
		store.getState().inc()
		expect(store.getState().count).toBe(1)
		expect(store.history.getState().pasts).toEqual([
			expect.objectContaining({ count: 0 }),
		])
	})

	it('records when an action uses the wrapped set with a function updater', () => {
		const store = makeCounter()
		store.getState().inc()
		expect(store.getState().count).toBe(1)
		expect(store.history.getState().pasts.length).toBe(1)
	})

	it('records each nested action call', () => {
		const store = makeCounter()
		store.getState().inc()
		store.getState().incBy(5)
		expect(store.getState().count).toBe(6)
		expect(store.history.getState().pasts.length).toBe(2)
	})
})

describe('withHistory — function updater evaluated exactly once per write', () => {
	it('updater fn from external setState is invoked once', () => {
		const store = makePaintStore()
		const fn = vi.fn((s: PaintState) => ({ color: s.color + '!' }))
		store.setState(fn)
		expect(fn).toHaveBeenCalledTimes(1)
		expect(store.getState().color).toBe('red!')
	})

	it('updater fn from internal action set is invoked once', () => {
		const fn = vi.fn((s: CounterState) => ({ count: s.count + 1 }))
		const store = createStore<CounterState>()(
			withHistory((set) => ({
				count: 0,
				inc: () => {
					set(fn)
				},
				incBy: () => {},
				silentInc: () => {},
			})),
		)
		store.getState().inc()
		expect(fn).toHaveBeenCalledTimes(1)
		expect(store.getState().count).toBe(1)
	})
})

describe('withHistory — undo', () => {
	it('restores the previous state', () => {
		const store = makePaintStore()
		store.setState({ color: 'blue' })
		store.history.getState().undo()
		expect(store.getState().color).toBe('red')
	})

	it('moves restored state into futures', () => {
		const store = makePaintStore()
		store.setState({ color: 'blue' })
		store.history.getState().undo()
		expect(store.history.getState().futures).toEqual([{ color: 'blue', size: 10 }])
	})

	it('removes the restored entry from pasts', () => {
		const store = makePaintStore()
		store.setState({ color: 'blue' })
		store.history.getState().undo()
		expect(store.history.getState().pasts).toHaveLength(0)
	})

	it('no-op when pasts is empty', () => {
		const store = makePaintStore()
		expect(() => {
			store.history.getState().undo()
		}).not.toThrow()
		expect(store.getState()).toEqual({ color: 'red', size: 10 })
		expect(store.history.getState().pasts).toEqual([])
		expect(store.history.getState().futures).toEqual([])
	})

	it('undo restoration is NOT recorded in pasts', () => {
		const store = makePaintStore()
		store.setState({ color: 'blue' })
		store.history.getState().undo()
		expect(store.history.getState().pasts).toEqual([])
	})
})

describe('withHistory — redo', () => {
	it('restores the next future state', () => {
		const store = makePaintStore()
		store.setState({ color: 'blue' })
		store.history.getState().undo()
		store.history.getState().redo()
		expect(store.getState().color).toBe('blue')
	})

	it('pushes the current state back into pasts on redo', () => {
		const store = makePaintStore()
		store.setState({ color: 'blue' })
		store.history.getState().undo()
		store.history.getState().redo()
		expect(store.history.getState().pasts).toEqual([{ color: 'red', size: 10 }])
	})

	it('removes the restored state from futures', () => {
		const store = makePaintStore()
		store.setState({ color: 'blue' })
		store.history.getState().undo()
		store.history.getState().redo()
		expect(store.history.getState().futures).toEqual([])
	})

	it('no-op when futures is empty', () => {
		const store = makePaintStore()
		expect(() => {
			store.history.getState().redo()
		}).not.toThrow()
		expect(store.getState()).toEqual({ color: 'red', size: 10 })
	})
})

describe('withHistory — goto', () => {
	type S = { v: number }

	function setupTimeline() {
		// Build pasts=[A,B,C,D] current=E futures=[F,G] by simulation.
		const store = createStore<S>()(withHistory(() => ({ v: 0 })))
		store.setState({ v: 1 }) // pasts: [0], current: 1
		store.setState({ v: 2 }) // pasts: [0,1], current: 2
		store.setState({ v: 3 }) // pasts: [0,1,2], current: 3
		store.setState({ v: 4 }) // pasts: [0,1,2,3], current: 4
		store.history.getState().undo() // pasts: [0,1,2], current: 3, futures: [4]
		store.history.getState().undo() // pasts: [0,1], current: 2, futures: [3,4]
		// Now: pasts=[{v:0},{v:1}], current={v:2}, futures=[{v:3},{v:4}]
		return store
	}

	it('moves backward to a specific past index atomically', () => {
		const store = setupTimeline()
		// pasts=[A,B,C,D], current=E, futures=[F,G] would require richer setup; we
		// validate the algorithm via the smaller timeline above.
		// pasts=[{v:0},{v:1}], current={v:2}, futures=[{v:3},{v:4}]
		store.history.getState().goto(0)
		expect(store.getState()).toEqual({ v: 0 })
		expect(store.history.getState().pasts).toEqual([])
		expect(store.history.getState().futures).toEqual([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }])
	})

	it('moves forward to a specific future index atomically', () => {
		const store = setupTimeline()
		store.history.getState().goto(4) // target index 4 → state={v:4}
		expect(store.getState()).toEqual({ v: 4 })
		expect(store.history.getState().pasts).toEqual([{ v: 0 }, { v: 1 }, { v: 2 }, { v: 3 }])
		expect(store.history.getState().futures).toEqual([])
	})

	it('clamps target index below 0', () => {
		const store = setupTimeline()
		store.history.getState().goto(-100)
		expect(store.getState()).toEqual({ v: 0 })
	})

	it('clamps target index above total length', () => {
		const store = setupTimeline()
		store.history.getState().goto(99999)
		expect(store.getState()).toEqual({ v: 4 })
	})

	it('is a no-op when target equals current index', () => {
		const store = setupTimeline()
		const before = store.getState()
		const pastsBefore = store.history.getState().pasts
		const futuresBefore = store.history.getState().futures
		store.history.getState().goto(store.history.getState().pasts.length)
		expect(store.getState()).toBe(before)
		expect(store.history.getState().pasts).toBe(pastsBefore)
		expect(store.history.getState().futures).toBe(futuresBefore)
	})

	it('goto restoration is NOT recorded', () => {
		const store = setupTimeline()
		store.history.getState().goto(0)
		// After goto, futures should hold the trailing states but pasts should be exactly the slice below target.
		expect(store.history.getState().pasts).toEqual([])
	})

	it('notifies each store subscriber exactly once per goto', () => {
		const store = setupTimeline()
		const stateListener = vi.fn()
		const historyListener = vi.fn()
		const unsubA = store.subscribe(stateListener)
		const unsubB = store.history.subscribe(historyListener)
		store.history.getState().goto(0)
		expect(stateListener).toHaveBeenCalledTimes(1)
		expect(historyListener).toHaveBeenCalledTimes(1)
		unsubA()
		unsubB()
	})
})

describe('withHistory — clear', () => {
	it('empties pasts and futures', () => {
		const store = makePaintStore()
		store.setState({ color: 'blue' })
		store.history.getState().undo()
		store.history.getState().clear()
		expect(store.history.getState().pasts).toEqual([])
		expect(store.history.getState().futures).toEqual([])
	})

	it('does not change store state', () => {
		const store = makePaintStore()
		store.setState({ color: 'blue' })
		store.history.getState().clear()
		expect(store.getState().color).toBe('blue')
	})
})

describe('withHistory — pause / resume', () => {
	it('pause stops recording subsequent writes', () => {
		const store = makePaintStore()
		store.history.getState().pause()
		store.setState({ color: 'blue' })
		store.setState({ color: 'green' })
		expect(store.history.getState().pasts).toEqual([])
		expect(store.history.getState().isPaused).toBe(true)
	})

	it('resume re-enables recording', () => {
		const store = makePaintStore()
		store.history.getState().pause()
		store.setState({ color: 'blue' })
		store.history.getState().resume()
		store.setState({ color: 'green' })
		expect(store.history.getState().pasts).toHaveLength(1)
		expect(store.history.getState().pasts[0]).toEqual({ color: 'blue', size: 10 })
	})

	it('defaultPaused: true seeds isPaused', () => {
		const store = createStore<PaintState>()(
			withHistory(() => ({ color: 'red', size: 10 }), { defaultPaused: true }),
		)
		store.setState({ color: 'blue' })
		expect(store.history.getState().pasts).toEqual([])
		expect(store.history.getState().isPaused).toBe(true)
	})
})

describe('withHistory — skip', () => {
	it('skipped external setState is not recorded but state changes', () => {
		const store = makePaintStore()
		store.history.getState().skip(() => {
			store.setState({ color: 'blue' })
		})
		expect(store.getState().color).toBe('blue')
		expect(store.history.getState().pasts).toEqual([])
	})

	it('skipped internal action set is not recorded but state changes', () => {
		const store = createStore<CounterState>()(
			withHistory((set, _get, api) => ({
				count: 0,
				inc: () => {
					set((s) => ({ count: s.count + 1 }))
				},
				incBy: () => {},
				silentInc: () => {
					api.history.getState().skip(() => {
						set((s) => ({ count: s.count + 1 }))
					})
				},
			})),
		)
		store.getState().silentInc()
		expect(store.getState().count).toBe(1)
		expect(store.history.getState().pasts).toEqual([])
	})

	it('nested skip restores outer paused state', () => {
		const store = makePaintStore()
		store.history.getState().pause()
		store.history.getState().skip(() => {
			store.setState({ color: 'blue' })
		})
		expect(store.history.getState().isPaused).toBe(true)
	})

	it('nested skip inside non-paused store leaves isPaused false', () => {
		const store = makePaintStore()
		store.history.getState().skip(() => {
			store.setState({ color: 'blue' })
		})
		expect(store.history.getState().isPaused).toBe(false)
	})
})

describe('withHistory — shouldRecord predicate', () => {
	it('predicate returning false skips recording but state updates', () => {
		const store = createStore<PaintState>()(
			withHistory(() => ({ color: 'red', size: 10 }), {
				shouldRecord: (_prev, next) => next.color !== 'red',
			}),
		)
		store.setState({ size: 20 })
		expect(store.getState()).toEqual({ color: 'red', size: 20 })
		expect(store.history.getState().pasts).toEqual([])
	})

	it('predicate returning true records', () => {
		const store = createStore<PaintState>()(
			withHistory(() => ({ color: 'red', size: 10 }), {
				shouldRecord: () => true,
			}),
		)
		store.setState({ color: 'blue' })
		expect(store.history.getState().pasts).toHaveLength(1)
	})

	it('predicate receives the action tag from set(partial, replace, action)', () => {
		const seen: (string | { type: string } | undefined)[] = []
		const store = createStore<CounterState>()(
			withHistory(
				(set) => ({
					count: 0,
					inc: () => {
						;(set as (p: Partial<CounterState>, r?: boolean, a?: string) => void)({ count: 1 }, false, 'inc')
					},
					incBy: () => {},
					silentInc: () => {},
				}),
				{
					shouldRecord: (_prev, _next, action) => {
						seen.push(action)
						return action !== 'cursor/move'
					},
				},
			),
		)
		store.getState().inc()
		expect(seen).toEqual(['inc'])
		expect(store.history.getState().pasts).toHaveLength(1)
	})

	it('predicate receives undefined when no action tag is passed', () => {
		const seen: (string | { type: string } | undefined)[] = []
		const store = createStore<PaintState>()(
			withHistory(() => ({ color: 'red', size: 10 }), {
				shouldRecord: (_prev, _next, action) => {
					seen.push(action)
					return true
				},
			}),
		)
		store.setState({ color: 'blue' })
		expect(seen).toEqual([undefined])
	})

	it('absence of shouldRecord records every write', () => {
		const store = makePaintStore()
		store.setState({ color: 'a' })
		store.setState({ color: 'b' })
		store.setState({ color: 'c' })
		expect(store.history.getState().pasts).toHaveLength(3)
	})

	it('predicate is NOT invoked during undo/redo/goto restorations', () => {
		const fn = vi.fn(() => true)
		const store = createStore<PaintState>()(
			withHistory(() => ({ color: 'red', size: 10 }), { shouldRecord: fn }),
		)
		store.setState({ color: 'blue' })
		fn.mockClear()
		store.history.getState().undo()
		store.history.getState().redo()
		store.history.getState().goto(0)
		expect(fn).not.toHaveBeenCalled()
	})
})

describe('withHistory — limit and seeded defaults', () => {
	it('default limit is 100', () => {
		const store = makePaintStore()
		expect(store.history.getState().limit).toBe(100)
	})

	it('caps pasts at the configured limit', () => {
		const store = createStore<PaintState>()(
			withHistory(() => ({ color: 'red', size: 10 }), { limit: 2 }),
		)
		store.setState({ color: 'a' })
		store.setState({ color: 'b' })
		store.setState({ color: 'c' })
		expect(store.history.getState().pasts).toHaveLength(2)
		expect(store.history.getState().pasts.map((p) => p.color)).toEqual(['a', 'b'])
	})

	it('defaultPasts is trimmed from the front to limit', () => {
		const pasts: PaintState[] = [
			{ color: 'a', size: 1 },
			{ color: 'b', size: 2 },
			{ color: 'c', size: 3 },
		]
		const store = createStore<PaintState>()(
			withHistory(() => ({ color: 'red', size: 10 }), { defaultPasts: pasts, limit: 2 }),
		)
		expect(store.history.getState().pasts).toEqual([
			{ color: 'b', size: 2 },
			{ color: 'c', size: 3 },
		])
	})

	it('defaultFutures is also trimmed from the front to limit (symmetric with defaultPasts)', () => {
		const futures: PaintState[] = [
			{ color: 'a', size: 1 },
			{ color: 'b', size: 2 },
			{ color: 'c', size: 3 },
		]
		const store = createStore<PaintState>()(
			withHistory(() => ({ color: 'red', size: 10 }), { defaultFutures: futures, limit: 2 }),
		)
		expect(store.history.getState().futures).toEqual([
			{ color: 'b', size: 2 },
			{ color: 'c', size: 3 },
		])
	})

	it('undo works with defaultPasts pre-populated', () => {
		const past: PaintState = { color: 'blue', size: 5 }
		const store = createStore<PaintState>()(
			withHistory(() => ({ color: 'red', size: 10 }), { defaultPasts: [past] }),
		)
		store.history.getState().undo()
		expect(store.getState()).toEqual(past)
	})

	it('redo works with defaultFutures pre-populated', () => {
		const future: PaintState = { color: 'green', size: 20 }
		const store = createStore<PaintState>()(
			withHistory(() => ({ color: 'red', size: 10 }), { defaultFutures: [future] }),
		)
		store.history.getState().redo()
		expect(store.getState()).toEqual(future)
	})
})

describe('withHistory — sub-store isolation', () => {
	it('store subscribers do not fire on history-only changes (clear)', () => {
		const store = makePaintStore()
		const stateListener = vi.fn()
		const unsub = store.subscribe(stateListener)
		store.history.getState().clear()
		expect(stateListener).not.toHaveBeenCalled()
		unsub()
	})

	it('history subscribers fire on recorded setState', () => {
		const store = makePaintStore()
		const historyListener = vi.fn()
		const unsub = store.history.subscribe(historyListener)
		store.setState({ color: 'blue' })
		expect(historyListener).toHaveBeenCalledTimes(1)
		unsub()
	})
})

describe('withHistory — type-level surface', () => {
	it('store has a `history` property typed as a StoreApi<HistoryState<T>>', () => {
		const store = createStore<PaintState>()(withHistory(() => ({ color: 'red', size: 10 })))
		const h = store.history.getState()
		expect(typeof h.undo).toBe('function')
		expect(typeof h.redo).toBe('function')
		expect(typeof h.goto).toBe('function')
		expect(typeof h.clear).toBe('function')
		expect(typeof h.pause).toBe('function')
		expect(typeof h.resume).toBe('function')
		expect(typeof h.skip).toBe('function')
		expect(Array.isArray(h.pasts)).toBe(true)
		expect(Array.isArray(h.futures)).toBe(true)
		expect(typeof h.limit).toBe('number')
		expect(typeof h.isPaused).toBe('boolean')
	})
})

import { describe, expect, it, vi } from 'vitest'

import { createHistoryStack } from './stack'

import type { HistoryAdapter, HistorySnapshot } from './types'

type State = { count: number }

function harness(initial: State = { count: 0 }) {
	let current = initial
	const snapshots: HistorySnapshot<State>[] = []
	const adapter: HistoryAdapter<State> = {
		read: () => current,
		write: (state) => {
			current = state
		},
		onStateChange: (snapshot) => snapshots.push(snapshot),
	}
	return {
		adapter,
		snapshots,
		get current() {
			return current
		},
		set current(next: State) {
			current = next
		},
	}
}

describe('createHistoryStack', () => {
	it('records a past entry and clears futures', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})

		history.record({ count: 0 }, { count: 1 })
		h.current = { count: 1 }

		expect(h.snapshots.at(-1)?.pasts).toEqual([{ count: 0 }])
		expect(h.snapshots.at(-1)?.futures).toEqual([])
	})

	it('undo writes the previous state back and moves the current one into futures', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		history.record({ count: 0 }, { count: 1 })
		h.current = { count: 1 }

		history.undo()

		expect(h.current).toEqual({ count: 0 })
		expect(h.snapshots.at(-1)?.futures).toEqual([{ count: 1 }])
		expect(h.snapshots.at(-1)?.pasts).toEqual([])
	})

	it('is a no-op when there is nothing to undo or redo', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		const before = h.snapshots.length

		history.undo()
		history.redo()

		expect(h.current).toEqual({ count: 0 })
		expect(h.snapshots.length).toBe(before)
	})

	it('trims the pasts stack from the front once limit is exceeded', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, { limit: 2 })

		history.record({ count: 0 }, { count: 1 })
		history.record({ count: 1 }, { count: 2 })
		history.record({ count: 2 }, { count: 3 })

		expect(h.snapshots.at(-1)?.pasts).toEqual([{ count: 1 }, { count: 2 }])
	})

	it('trims defaultPasts beyond limit from the front', () => {
		const h = harness()
		createHistoryStack(h.adapter, { limit: 1, defaultPasts: [{ count: 7 }, { count: 8 }] })

		expect(h.snapshots.at(-1)?.pasts).toEqual([{ count: 8 }])
	})

	it('does not record while paused, and the state still changes', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, { defaultPaused: true })

		history.record({ count: 0 }, { count: 1 })

		expect(h.snapshots.at(-1)?.pasts ?? []).toEqual([])
	})

	it('skip is re-entrant and restores the outer paused value', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, { defaultPaused: true })

		history.skip(() => {
			history.skip(() => {})
			expect(history.isPaused).toBe(true)
		})

		expect(history.isPaused).toBe(true)
	})

	it('skips a write when shouldRecord returns false but still lets it through', () => {
		const h = harness()
		const shouldRecord = vi.fn(() => false)
		const history = createHistoryStack<State, string>(h.adapter, { shouldRecord })

		history.record({ count: 0 }, { count: 1 }, 'typing')

		expect(shouldRecord).toHaveBeenCalledWith({ count: 0 }, { count: 1 }, 'typing')
		expect(h.snapshots.at(-1)?.pasts ?? []).toEqual([])
	})

	it('goto jumps to an absolute timeline position with a single write', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		history.record({ count: 0 }, { count: 1 })
		history.record({ count: 1 }, { count: 2 })
		h.current = { count: 2 }
		const writes = h.snapshots.length

		history.goto(0)

		expect(h.current).toEqual({ count: 0 })
		expect(h.snapshots.length).toBe(writes + 1)
		expect(h.snapshots.at(-1)?.futures).toEqual([{ count: 1 }, { count: 2 }])
	})

	it('clamps an out-of-range goto index instead of throwing', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		history.record({ count: 0 }, { count: 1 })
		h.current = { count: 1 }

		history.goto(-5)
		expect(h.current).toEqual({ count: 0 })

		history.goto(99)
		expect(h.current).toEqual({ count: 1 })
	})

	it('clear empties both stacks without touching the state', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		history.record({ count: 0 }, { count: 1 })
		h.current = { count: 1 }

		history.clear()

		expect(h.current).toEqual({ count: 1 })
		expect(h.snapshots.at(-1)?.pasts).toEqual([])
		expect(h.snapshots.at(-1)?.futures).toEqual([])
	})

	it('goto does not trim an already-over-limit seed — it only reorders, never deletes', () => {
		// limit 2, seeded independently at the cap on both sides (defaultPasts and defaultFutures
		// are each trimmed to `limit` on their own, so their SUM can start above `limit` — a real
		// path via a persisted/deep-linked history, not just accumulation past the cap).
		const h = harness({ count: 0 })
		const history = createHistoryStack(h.adapter, {
			limit: 2,
			defaultPasts: [{ count: -2 }, { count: -1 }],
			defaultFutures: [{ count: 1 }, { count: 2 }],
		})

		history.goto(0)

		expect(h.current).toEqual({ count: -2 })
		expect(h.snapshots.at(-1)?.pasts).toEqual([])
		expect(h.snapshots.at(-1)?.futures).toEqual([{ count: -1 }, { count: 0 }, { count: 1 }, { count: 2 }])
	})

	it('undo on an over-limit seed keeps the just-left state as the nearest redo step', () => {
		// limit 2, defaultPasts=[-1] (1 entry) + defaultFutures=[1,2] (2 entries, already at cap) +
		// current=0 → combined stack of 4 states against a limit of 2.
		const h = harness({ count: 0 })
		const history = createHistoryStack(h.adapter, {
			limit: 2,
			defaultPasts: [{ count: -1 }],
			defaultFutures: [{ count: 1 }, { count: 2 }],
		})

		history.undo()

		expect(h.current).toEqual({ count: -1 })
		// The state undo just left (0) must be the nearest redo step, not silently dropped in favor
		// of keeping the farthest-away entries.
		expect(h.snapshots.at(-1)?.futures).toEqual([{ count: 0 }, { count: 1 }])
	})

	it('undo then redo returns to the original state under an over-limit seed', () => {
		const h = harness({ count: 0 })
		const history = createHistoryStack(h.adapter, {
			limit: 2,
			defaultPasts: [{ count: -1 }],
			defaultFutures: [{ count: 1 }, { count: 2 }],
		})

		history.undo()
		history.redo()

		expect(h.current).toEqual({ count: 0 })
	})

	it('publishes isPaused=true while `skip`s callback runs, and restores it after', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		let observedDuring: boolean | undefined

		history.skip(() => {
			observedDuring = h.snapshots.at(-1)?.isPaused
		})

		expect(observedDuring).toBe(true)
		expect(h.snapshots.at(-1)?.isPaused).toBe(false)
	})

	it('publishes the updated stacks before writing the restored state during undo/redo/goto', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		history.record({ count: 0 }, { count: 1 })
		h.current = { count: 1 }

		let pastsDuringWrite: readonly State[] | undefined
		const originalWrite = h.adapter.write
		h.adapter.write = (state) => {
			// A subscriber reacting to the state write must already see the NEW pasts/futures — not
			// the pair this operation is replacing.
			pastsDuringWrite = h.snapshots.at(-1)?.pasts
			originalWrite(state)
		}

		history.undo()

		expect(pastsDuringWrite).toEqual([])
	})

	it('deduplicates a redundant pause or resume — deliberately does not re-publish', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})

		history.pause()
		const afterFirstPause = h.snapshots.length
		history.pause()
		expect(h.snapshots.length).toBe(afterFirstPause)

		history.resume()
		const afterResume = h.snapshots.length
		history.resume()
		expect(h.snapshots.length).toBe(afterResume)
	})

	it('does not record the write it performs itself during undo', () => {
		const h = harness()
		const history = createHistoryStack(h.adapter, {})
		history.record({ count: 0 }, { count: 1 })
		h.current = { count: 1 }
		// эмулируем менеджер, который зовёт record из подписки на любую запись
		h.adapter.write = (state) => {
			h.current = state
			history.record({ count: 1 }, state)
		}

		history.undo()

		expect(h.snapshots.at(-1)?.pasts).toEqual([])
		expect(h.snapshots.at(-1)?.futures).toEqual([{ count: 1 }])
	})
})

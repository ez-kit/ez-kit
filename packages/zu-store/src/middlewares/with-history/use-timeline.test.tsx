import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { useHistory } from './use-history'
import { useTimeline } from './use-timeline'

import { withHistory } from './index'

type Doc = { title: string; body: string }

const makeStore = () => createStore<Doc>()(withHistory(() => ({ title: 'a', body: 'x' })))

describe('useHistory', () => {
	it('flattens the stacks, the controls and the can-flags into one object', () => {
		const store = makeStore()
		let history!: ReturnType<typeof useHistory<Doc>>
		function Probe(): null {
			history = useHistory(store)
			return null
		}

		render(<Probe />)

		expect(history.pasts).toEqual([])
		expect(history.futures).toEqual([])
		expect(history.canUndo).toBe(false)
		expect(history.canRedo).toBe(false)
		expect(typeof history.undo).toBe('function')
		expect(typeof history.goto).toBe('function')
	})

	it('re-renders with fresh flags as the stacks change', () => {
		const store = makeStore()
		let history!: ReturnType<typeof useHistory<Doc>>
		function Probe(): null {
			history = useHistory(store)
			return null
		}

		render(<Probe />)

		act(() => {
			store.setState({ title: 'b' })
		})
		expect(history.canUndo).toBe(true)
		expect(history.canRedo).toBe(false)

		act(() => {
			history.undo()
		})
		expect(history.canUndo).toBe(false)
		expect(history.canRedo).toBe(true)
	})
})

describe('useTimeline', () => {
	it('returns the live state as `current`', () => {
		const store = makeStore()
		let current!: Doc
		function Probe(): null {
			current = useTimeline(store).current
			return null
		}

		render(<Probe />)

		expect(current).toEqual({ title: 'a', body: 'x' })
	})

	it('puts `current` at `index` on `[...pasts, current, ...futures]`', () => {
		const store = makeStore()
		let steps!: readonly Doc[]
		let index!: number
		let current!: Doc
		function Probe(): null {
			;({ steps, index, current } = useTimeline(store))
			return null
		}

		render(<Probe />)

		act(() => {
			store.setState({ title: 'b' })
		})
		act(() => {
			store.setState({ title: 'c' })
		})
		act(() => {
			store.history.getState().undo()
		})

		expect(steps.map((step) => step.title)).toEqual(['a', 'b', 'c'])
		expect(index).toBe(1)
		expect(steps[index]).toBe(current)
	})

	it('goto walks the store to the addressed step', () => {
		const store = makeStore()
		let goto!: (index: number) => void
		let current!: Doc
		function Probe(): null {
			;({ goto, current } = useTimeline(store))
			return null
		}

		render(<Probe />)

		act(() => {
			store.setState({ title: 'b' })
		})
		act(() => {
			goto(0)
		})

		expect(current).toEqual({ title: 'a', body: 'x' })
	})

	it('re-renders on an unrecorded store write, where `useHistory` alone does not', () => {
		const store = makeStore()
		let historyRenders = 0
		let timelineRenders = 0

		function Toolbar(): null {
			historyRenders += 1
			useHistory(store)
			return null
		}
		function Strip(): null {
			timelineRenders += 1
			useTimeline(store)
			return null
		}

		render(
			<>
				<Toolbar />
				<Strip />
			</>,
		)

		// Paused, so the write below never reaches the stacks — the only thing `useHistory` reads.
		act(() => {
			store.history.getState().pause()
		})
		const historyInitial = historyRenders
		const timelineInitial = timelineRenders

		act(() => {
			store.setState({ body: 'y' })
		})

		expect(historyRenders).toBe(historyInitial)
		expect(timelineRenders).toBeGreaterThan(timelineInitial)
	})
})

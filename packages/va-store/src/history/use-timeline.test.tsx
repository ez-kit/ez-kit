import { pipe } from '@ez-kit/store-core'
import { act, render } from '@testing-library/react'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { createContextStore } from '../create-context-store'

import { useHistory } from './use-history'
import { useTimeline } from './use-timeline'
import { withHistory } from './with-history'

const flush = () =>
	new Promise<void>((resolve) => {
		queueMicrotask(resolve)
	})

type Doc = { title: string; body: string }
type DocStore = ReturnType<ReturnType<typeof withHistory<Doc>>>

const makeStore = () => createContextStore(() => pipe(proxy<Doc>({ title: 'a', body: 'x' }), withHistory()))

describe('useTimeline', () => {
	it('returns the live state as `current`, without the history key', () => {
		const store = makeStore()
		let current!: Doc
		function Probe(): null {
			current = useTimeline(store.useStore()).current
			return null
		}

		render(
			<store.Provider>
				<Probe />
			</store.Provider>,
		)

		expect(current).toEqual({ title: 'a', body: 'x' })
		expect('history' in current).toBe(false)
	})

	it('puts `current` at `index` on `[...pasts, current, ...futures]`', async () => {
		const store = makeStore()
		let state!: DocStore
		let steps!: readonly Doc[]
		let index!: number
		let current!: Doc
		function Probe(): null {
			state = store.useStore()
			;({ steps, index, current } = useTimeline(state))
			return null
		}

		render(
			<store.Provider>
				<Probe />
			</store.Provider>,
		)

		await act(async () => {
			state.title = 'b'
			await flush()
		})
		await act(async () => {
			state.title = 'c'
			await flush()
		})
		await act(async () => {
			state.history.undo()
			await flush()
		})

		expect(steps.map((step) => step.title)).toEqual(['a', 'b', 'c'])
		expect(index).toBe(1)
		expect(steps[index]).toBe(current)
	})

	it('goto walks the store to the addressed step', async () => {
		const store = makeStore()
		let state!: DocStore
		let goto!: (index: number) => void
		let current!: Doc
		function Probe(): null {
			state = store.useStore()
			;({ goto, current } = useTimeline(state))
			return null
		}

		render(
			<store.Provider>
				<Probe />
			</store.Provider>,
		)

		await act(async () => {
			state.title = 'b'
			await flush()
		})
		await act(async () => {
			goto(0)
			await flush()
		})

		expect(current).toEqual({ title: 'a', body: 'x' })
	})

	it('re-renders on a store write, where `useHistory` alone does not', async () => {
		const store = makeStore()
		let state!: DocStore
		let historyRenders = 0
		let timelineRenders = 0

		function Toolbar(): null {
			historyRenders += 1
			state = store.useStore()
			const { canUndo } = useHistory(state)
			void canUndo
			return null
		}
		function Strip(): null {
			timelineRenders += 1
			useTimeline(store.useStore())
			return null
		}

		render(
			<store.Provider>
				<Toolbar />
				<Strip />
			</store.Provider>,
		)
		const historyInitial = historyRenders
		const timelineInitial = timelineRenders

		// Recorded through `skip`, so the stacks — all `useHistory` subscribes to — never change.
		await act(async () => {
			state.history.skip(() => {
				state.body = 'y'
			})
			await flush()
		})

		expect(historyRenders).toBe(historyInitial)
		expect(timelineRenders).toBeGreaterThan(timelineInitial)
	})
})

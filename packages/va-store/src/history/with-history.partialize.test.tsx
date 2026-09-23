import { pipe } from '@ez-kit/store-core'
import { act, render } from '@testing-library/react'
import { proxy } from 'valtio'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { useTimeline } from './use-timeline'
import { withHistory } from './with-history'

import type { StoreHistory } from './with-history'

type Graph = { nodes: string[]; edges: string[] }
type EditorState = Graph & { selected: string[]; lastError: string | null }

const pickGraph = (state: EditorState): Graph => ({ nodes: state.nodes, edges: state.edges })

const makeEditor = (options: { defaultPasts?: Graph[]; defaultFutures?: Graph[] } = {}) =>
	pipe(
		proxy<EditorState>({ nodes: [], edges: [], selected: [], lastError: null }),
		withHistory({ ...options, sync: true, partialize: pickGraph }),
	)

describe('withHistory — partialize: what a step holds', () => {
	it('records the slice, not the whole state', () => {
		const state = makeEditor()
		state.nodes = ['a']

		expect(state.history.state.pasts).toEqual([{ nodes: [], edges: [] }])
	})

	it('undo restores the slice and leaves every field outside it as it is', () => {
		const state = makeEditor()
		state.nodes = ['a']
		state.selected = ['a']
		state.lastError = 'boom'

		state.history.undo()

		expect(state.nodes).toEqual([])
		expect(state.selected).toEqual(['a'])
		expect(state.lastError).toBe('boom')
	})

	it('goto moves across slices the way it moves across whole states', () => {
		const state = makeEditor()
		state.nodes = ['a']
		state.nodes = ['a', 'b']
		state.selected = ['b']

		state.history.goto(0)

		expect(state.nodes).toEqual([])
		expect(state.selected).toEqual(['b'])
		expect(state.history.state.futures).toEqual([
			{ nodes: ['a'], edges: [] },
			{ nodes: ['a', 'b'], edges: [] },
		])
	})

	it('takes slices for defaultPasts and defaultFutures', () => {
		const state = makeEditor({ defaultPasts: [{ nodes: ['old'], edges: [] }] })
		state.selected = ['x']

		state.history.undo()

		expect(state.nodes).toEqual(['old'])
		expect(state.selected).toEqual(['x'])
	})
})

describe('withHistory — partialize: writes outside the slice', () => {
	it('records nothing for a write that leaves the slice unchanged', () => {
		const state = makeEditor()
		state.nodes = ['a']
		state.selected = ['a']
		state.lastError = 'boom'

		expect(state.history.state.pasts).toHaveLength(1)
	})

	it('does not clear futures for a write outside the slice', () => {
		const state = makeEditor()
		state.nodes = ['a']
		state.history.undo()

		state.selected = ['a']

		expect(state.history.state.futures).toEqual([{ nodes: ['a'], edges: [] }])
	})

	it('records nothing for a batched UI write under the default microtask batching', async () => {
		const state = pipe(
			proxy<EditorState>({ nodes: [], edges: [], selected: [], lastError: null }),
			withHistory({ partialize: pickGraph }),
		)
		state.selected = ['a']
		state.lastError = 'boom'
		await Promise.resolve()

		expect(state.history.state.pasts).toEqual([])
	})
})

describe('withHistory — partialize: redo and shouldRecord', () => {
	it('redo restores the slice it undid, still without touching the rest', () => {
		const state = makeEditor()
		state.nodes = ['a']
		state.history.undo()
		state.selected = ['b']

		state.history.redo()

		expect(state.nodes).toEqual(['a'])
		expect(state.selected).toEqual(['b'])
	})

	it('hands shouldRecord slices', () => {
		const seen: [Graph, Graph][] = []
		const state = pipe(
			proxy<EditorState>({ nodes: [], edges: [], selected: [], lastError: null }),
			withHistory({
				sync: true,
				partialize: pickGraph,
				shouldRecord: (prev, next) => {
					seen.push([prev, next])
					return true
				},
			}),
		)

		state.nodes = ['a']

		expect(seen).toEqual([
			[
				{ nodes: [], edges: [] },
				{ nodes: ['a'], edges: [] },
			],
		])
	})
})

describe('withHistory — partialize: types', () => {
	it('rejects a partial seed without partialize instead of inferring a slice from it', () => {
		pipe(
			proxy({ count: 0, label: 'x' }),
			// @ts-expect-error -- without `partialize`, undo would replace the whole state with this seed
			withHistory({ defaultPasts: [{ count: 1 }] }),
		)
	})

	it('types the history surface over the slice', () => {
		const state = makeEditor()

		expectTypeOf(state.history).toEqualTypeOf<StoreHistory<Graph>>()
	})

	it('keeps the full state as the step type without partialize', () => {
		const state = pipe(proxy({ count: 0 }), withHistory())

		expectTypeOf(state.history).toEqualTypeOf<StoreHistory<{ count: number }>>()
	})
})

describe('useTimeline — with partialize', () => {
	it('shapes `current` like a step: the slice, not the whole state', async () => {
		const state = makeEditor()
		let timeline!: ReturnType<typeof useTimeline<EditorState, Graph>>
		function Probe(): null {
			timeline = useTimeline(state)
			return null
		}

		render(<Probe />)
		// Valtio notifies React on a microtask, so the re-render lands after a synchronous `act`.
		await act(async () => {
			state.nodes = ['a']
			await Promise.resolve()
		})

		expect(timeline.current).toEqual({ nodes: ['a'], edges: [] })
		expect(timeline.steps).toEqual([
			{ nodes: [], edges: [] },
			{ nodes: ['a'], edges: [] },
		])
	})
})

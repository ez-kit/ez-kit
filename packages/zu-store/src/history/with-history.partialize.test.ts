import { describe, expect, expectTypeOf, it } from 'vitest'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'

import { withHistory } from './with-history'

import type { StoreHistory } from './types'
import type { StoreApi } from 'zustand/vanilla'

type Graph = { nodes: string[]; edges: string[] }

type EditorState = Graph & {
	selected: string[]
	lastError: string | null
	addNode: (id: string) => void
	select: (id: string) => void
}

const pickGraph = (state: EditorState): Graph => ({ nodes: state.nodes, edges: state.edges })

const makeEditor = (options: { limit?: number; defaultPasts?: Graph[]; defaultFutures?: Graph[] } = {}) =>
	createStore<EditorState>()(
		withHistory(
			(set) => ({
				nodes: [],
				edges: [],
				selected: [],
				lastError: null,
				addNode: (id) => {
					set((s) => ({ nodes: [...s.nodes, id] }))
				},
				select: (id) => {
					set({ selected: [id] })
				},
			}),
			{ ...options, partialize: pickGraph },
		),
	)

describe('withHistory — partialize: what a step holds', () => {
	it('records the slice, not the whole state', () => {
		const store = makeEditor()
		store.getState().addNode('a')

		expect(store.history.getState().pasts).toEqual([{ nodes: [], edges: [] }])
	})

	it('undo restores the slice and leaves every field outside it as it is', () => {
		const store = makeEditor()
		store.getState().addNode('a')
		store.getState().select('a')
		store.setState({ lastError: 'boom' })

		store.history.getState().undo()

		const state = store.getState()
		expect(state.nodes).toEqual([])
		expect(state.selected).toEqual(['a'])
		expect(state.lastError).toBe('boom')
		expect(typeof state.addNode).toBe('function')
	})

	it('redo restores the slice it undid, still without touching the rest', () => {
		const store = makeEditor()
		store.getState().addNode('a')
		store.history.getState().undo()
		store.getState().select('b')

		store.history.getState().redo()

		expect(store.getState().nodes).toEqual(['a'])
		expect(store.getState().selected).toEqual(['b'])
	})

	it('goto moves across slices the way it moves across whole states', () => {
		const store = makeEditor()
		store.getState().addNode('a')
		store.getState().addNode('b')
		store.getState().addNode('c')
		store.getState().select('c')

		store.history.getState().goto(1)

		expect(store.getState().nodes).toEqual(['a'])
		expect(store.getState().selected).toEqual(['c'])
		expect(store.history.getState().pasts).toEqual([{ nodes: [], edges: [] }])
		expect(store.history.getState().futures).toEqual([
			{ nodes: ['a', 'b'], edges: [] },
			{ nodes: ['a', 'b', 'c'], edges: [] },
		])
	})
})

describe('withHistory — partialize: writes outside the slice', () => {
	it('records nothing for a write that leaves the slice unchanged', () => {
		const store = makeEditor()
		store.getState().addNode('a')
		store.getState().select('a')
		store.setState({ lastError: 'boom' })

		expect(store.history.getState().pasts).toHaveLength(1)
	})

	it('does not clear futures for a write outside the slice', () => {
		const store = makeEditor()
		store.getState().addNode('a')
		store.history.getState().undo()

		store.getState().select('a')

		expect(store.history.getState().futures).toEqual([{ nodes: ['a'], edges: [] }])
	})

	it('records nothing when a write sets a slice field to the same reference', () => {
		const store = makeEditor()
		const { nodes } = store.getState()

		store.setState({ nodes })

		expect(store.history.getState().pasts).toEqual([])
	})

	it('one undo takes back one graph change, however many UI writes followed it', () => {
		const store = makeEditor()
		store.getState().addNode('a')
		store.getState().select('a')
		store.getState().select('b')
		store.setState({ lastError: 'boom' })

		store.history.getState().undo()

		expect(store.getState().nodes).toEqual([])
		expect(store.history.getState().pasts).toEqual([])
	})

	it('hands shouldRecord slices', () => {
		const seen: [Graph, Graph][] = []
		const store = createStore<EditorState>()(
			withHistory(
				(set) => ({
					nodes: [],
					edges: [],
					selected: [],
					lastError: null,
					addNode: (id) => {
						set((s) => ({ nodes: [...s.nodes, id] }))
					},
					select: () => undefined,
				}),
				{
					partialize: pickGraph,
					shouldRecord: (prev, next) => {
						seen.push([prev, next])
						return true
					},
				},
			),
		)

		store.getState().addNode('a')

		expect(seen).toEqual([
			[
				{ nodes: [], edges: [] },
				{ nodes: ['a'], edges: [] },
			],
		])
	})
})

describe('withHistory — partialize: seeds', () => {
	it('takes slices for defaultPasts and defaultFutures', () => {
		const store = makeEditor({
			defaultPasts: [{ nodes: ['old'], edges: [] }],
			defaultFutures: [{ nodes: ['new'], edges: [] }],
		})
		store.getState().select('x')

		store.history.getState().undo()
		expect(store.getState().nodes).toEqual(['old'])
		expect(store.getState().selected).toEqual(['x'])

		store.history.getState().redo()
		store.history.getState().redo()
		expect(store.getState().nodes).toEqual(['new'])
	})
})

describe('withHistory — partialize: types', () => {
	it('types the history sub-store over the slice', () => {
		const store = makeEditor()

		expectTypeOf(store.history).toEqualTypeOf<StoreApi<StoreHistory<Graph>>>()
		expectTypeOf(store.history.getState().pasts).toEqualTypeOf<readonly Graph[]>()
	})

	it('keeps the full state as the step type without partialize', () => {
		const store = createStore<{ count: number }>()(withHistory(() => ({ count: 0 })))

		expectTypeOf(store.history).toEqualTypeOf<StoreApi<StoreHistory<{ count: number }>>>()
	})

	it('rejects a full state where a slice is expected', () => {
		createStore<EditorState>()(
			withHistory(
				(set) => ({
					nodes: [],
					edges: [],
					selected: [],
					lastError: null,
					addNode: () => undefined,
					select: (id) => {
						set({ selected: [id] })
					},
				}),
				{
					partialize: pickGraph,
					// @ts-expect-error -- a seed is a slice, and `selected` is not part of it
					defaultPasts: [{ nodes: [], edges: [], selected: [] }],
				},
			),
		)
	})
})

describe('withHistory — without partialize, the step is still the whole state', () => {
	type Counter = { count: number; label: string }

	it('rejects a partial seed instead of inferring a slice from it', () => {
		createStore<Counter>()(
			withHistory(() => ({ count: 0, label: 'x' }), {
				// @ts-expect-error -- without `partialize`, undo would replace the whole state with this seed
				defaultPasts: [{ count: 1 }],
			}),
		)
	})

	it('does not narrow the history type from an annotated shouldRecord', () => {
		const store = createStore<Counter>()(
			withHistory(() => ({ count: 0, label: 'x' }), {
				// A narrower parameter is a valid `shouldRecord` over whole states; it must not become the slice.
				shouldRecord: (prev: { count: number }, next: { count: number }) => prev.count !== next.count,
			}),
		)

		expectTypeOf(store.history).toEqualTypeOf<StoreApi<StoreHistory<Counter>>>()
	})

	it('rejects a slice that is not an object', () => {
		createStore<Counter>()(
			withHistory(() => ({ count: 0, label: 'x' }), {
				// @ts-expect-error -- restoring merges the slice key by key, so it has to be an object
				partialize: (s) => s.count,
			}),
		)
	})
})

describe('withHistory — partialize: pause and skip', () => {
	it('does not record a slice change made while paused, nor a UI write after resume', () => {
		const store = makeEditor()
		store.history.getState().pause()
		store.getState().addNode('a')
		store.history.getState().resume()

		store.getState().select('a')

		expect(store.history.getState().pasts).toEqual([])
	})

	it('clearFutures beside a skipped slice write stops redo from reviving an undone branch', () => {
		const store = makeEditor()
		store.getState().addNode('a')
		store.history.getState().undo()

		// A graph write that must not be its own undo step, but that the undone `a` no longer follows.
		store.history.getState().clearFutures()
		store.history.getState().skip(() => {
			store.getState().addNode('b')
		})
		store.history.getState().redo()

		expect(store.getState().nodes).toEqual(['b'])
		expect(store.history.getState().pasts).toEqual([])
		expect(store.history.getState().futures).toEqual([])
	})
})

describe('withHistory — partialize: composition', () => {
	it('works under devtools(subscribeWithSelector(withHistory(…)))', () => {
		const store = createStore<EditorState>()(
			devtools(
				subscribeWithSelector(
					withHistory(
						(set) => ({
							nodes: [],
							edges: [],
							selected: [],
							lastError: null,
							addNode: (id) => {
								set((s) => ({ nodes: [...s.nodes, id] }), false, 'graph/addNode')
							},
							select: (id) => {
								set({ selected: [id] }, false, 'ui/select')
							},
						}),
						{ partialize: pickGraph },
					),
				),
				{ enabled: false },
			),
		)
		const seen: string[][] = []
		const unsub = store.subscribe(
			(s) => s.nodes,
			(nodes) => seen.push(nodes),
		)

		store.getState().addNode('a')
		store.getState().select('a')
		store.history.getState().undo()

		expect(seen).toEqual([['a'], []])
		expect(store.getState().selected).toEqual(['a'])
		expectTypeOf(store.history.getState().pasts).toEqualTypeOf<readonly Graph[]>()
		unsub()
	})
})

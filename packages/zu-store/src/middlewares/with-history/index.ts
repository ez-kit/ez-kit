import { createStore } from 'zustand/vanilla'

import type { HistoryActionTag, HistoryOptions, HistoryState } from './types'
import type { StateCreator, StoreApi, StoreMutatorIdentifier } from 'zustand/vanilla'

export type { HistoryActionTag, HistoryOptions, HistoryState }

const DEFAULT_LIMIT = 100

type WithHistoryStore<S> = S extends { getState: () => infer T } ? S & { history: StoreApi<HistoryState<T>> } : S

declare module 'zustand/vanilla' {
	/* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars -- declaration merging requires `interface` */
	interface StoreMutators<S, A> {
		'ez-kit/history': WithHistoryStore<S>
	}
	/* eslint-enable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars */
}

type WithHistory = <
	T,
	Mps extends [StoreMutatorIdentifier, unknown][] = [],
	Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
	initializer: StateCreator<T, [...Mps, ['ez-kit/history', unknown]], Mcs>,
	options?: HistoryOptions<T>,
) => StateCreator<T, Mps, [['ez-kit/history', unknown], ...Mcs]>

type WithHistoryImpl = <T>(initializer: StateCreator<T>, options?: HistoryOptions<T>) => StateCreator<T>

function trimToLimit<T>(arr: readonly T[] | undefined, limit: number): T[] {
	if (!arr || arr.length === 0) return []
	return arr.length > limit ? arr.slice(-limit) : arr.slice()
}

const withHistoryImpl: WithHistoryImpl =
	(initializer, options = {}) =>
	(set, get, api) => {
		type T = ReturnType<typeof get>
		type HState = HistoryState<T>

		const limit = options.limit ?? DEFAULT_LIMIT
		const seedPasts = trimToLimit(options.defaultPasts, limit)
		const seedFutures = trimToLimit(options.defaultFutures, limit)
		const seedPaused = options.defaultPaused ?? false

		let recordingEnabled = false
		let isRestoring = false

		// Loose alias so we can pass through the optional `action` third argument
		// without fighting the StateCreator's `set` overload set.
		const rawSet = set as (partial: T | Partial<T>, replace?: boolean, action?: HistoryActionTag) => void

		function withRestore(fn: () => void): void {
			const prior = isRestoring
			isRestoring = true
			try {
				fn()
			} finally {
				isRestoring = prior
			}
		}

		function doSkip(fn: () => void): void {
			const prior = historyStore.getState().isPaused
			historyStore.setState({ isPaused: true })
			try {
				fn()
			} finally {
				historyStore.setState({ isPaused: prior })
			}
		}

		function doUndo(): void {
			const { pasts, futures } = historyStore.getState()
			const prev = pasts.at(-1)
			if (prev === undefined) return
			const current = get()
			historyStore.setState({
				pasts: pasts.slice(0, -1),
				futures: [current, ...futures],
			})
			withRestore(() => {
				rawSet(prev, true)
			})
		}

		function doRedo(): void {
			const { pasts, futures } = historyStore.getState()
			const next = futures.at(0)
			if (next === undefined) return
			const current = get()
			historyStore.setState({
				pasts: [...pasts, current],
				futures: futures.slice(1),
			})
			withRestore(() => {
				rawSet(next, true)
			})
		}

		function doGoto(target: number): void {
			const { pasts, futures } = historyStore.getState()
			const currentIndex = pasts.length
			const total = currentIndex + futures.length
			const clamped = Math.max(0, Math.min(target, total))
			if (clamped === currentIndex) return

			const current = get()
			let newPasts: T[]
			let newFutures: T[]
			let newCurrent: T

			if (clamped < currentIndex) {
				newPasts = pasts.slice(0, clamped)
				newCurrent = pasts[clamped] as T
				newFutures = [...pasts.slice(clamped + 1), current, ...futures] as T[]
			} else {
				const delta = clamped - currentIndex
				newPasts = [...pasts, current, ...futures.slice(0, delta - 1)] as T[]
				newCurrent = futures[delta - 1] as T
				newFutures = futures.slice(delta)
			}

			historyStore.setState({ pasts: newPasts, futures: newFutures })
			withRestore(() => {
				rawSet(newCurrent, true)
			})
		}

		function doClear(): void {
			historyStore.setState({ pasts: [], futures: [] })
		}

		function doPause(): void {
			historyStore.setState({ isPaused: true })
		}

		function doResume(): void {
			historyStore.setState({ isPaused: false })
		}

		const historyStore: StoreApi<HState> = createStore<HState>()(() => ({
			pasts: seedPasts,
			futures: seedFutures,
			limit,
			isPaused: seedPaused,
			undo: doUndo,
			redo: doRedo,
			goto: doGoto,
			clear: doClear,
			pause: doPause,
			resume: doResume,
			skip: doSkip,
		}))

		function recordWrite(prev: T, next: T, action: HistoryActionTag | undefined): void {
			if (!recordingEnabled || isRestoring) return
			const { isPaused, pasts, limit: histLimit } = historyStore.getState()
			if (isPaused) return
			if (options.shouldRecord && !options.shouldRecord(prev, next, action)) return

			const updated = [...pasts, prev]
			historyStore.setState({
				pasts: updated.length > histLimit ? updated.slice(-histLimit) : updated,
				futures: [],
			})
		}

		const wrappedSet: typeof set = (
			partial: T | Partial<T> | ((state: T) => T | Partial<T>),
			replace?: boolean,
			action?: HistoryActionTag,
		) => {
			const current = get()
			const nextPartial = typeof partial === 'function' ? (partial as (s: T) => T | Partial<T>)(current) : partial
			const next = replace === true ? (nextPartial as T) : { ...current, ...nextPartial }
			recordWrite(current, next, action)
			rawSet(nextPartial, replace, action)
		}

		// Replace external setState so callers of `store.setState(...)` also flow through history.
		;(api as unknown as { setState: typeof wrappedSet }).setState = wrappedSet
		// Attach the history sub-store. Mutator augmentation makes this typed.
		;(api as unknown as { history: StoreApi<HState> }).history = historyStore

		const initial = initializer(wrappedSet, get, api)
		// Initializer is done — any further writes are user-driven and should record.
		recordingEnabled = true
		return initial
	}

export const withHistory = withHistoryImpl as unknown as WithHistory

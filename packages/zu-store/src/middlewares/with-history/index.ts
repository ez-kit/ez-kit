import { createStore } from 'zustand/vanilla'

import type { HistoryOptions, HistoryState, HistoryStore, SetOptions } from './types'
import type { StoreApi } from 'zustand/vanilla'

export type { HistoryOptions, HistoryState, HistoryStore, SetOptions }

const DEFAULT_LIMIT = 100

export function withHistory<T extends object>(store: StoreApi<T>, options: HistoryOptions<T> = {}): HistoryStore<T> {
	const { limit = DEFAULT_LIMIT, defaultPaused = false, defaultPasts = [], defaultFutures = [], shouldPush } = options

	const initialPasts = defaultPasts.length > limit ? defaultPasts.slice(-limit) : defaultPasts

	// Capture the original setState before we replace it so undo/redo
	// can restore state without triggering another history entry.
	const originalSetState = store.setState.bind(store)

	// Self-referencing closures (undo/redo read historyStore lazily at call-time,
	// not during const initialisation, so the TDZ is not an issue).
	const historyStore = createStore<HistoryState<T>>()((set) => ({
		pasts: initialPasts,
		futures: defaultFutures,
		limit,
		isPaused: defaultPaused,
		undo() {
			const { pasts, futures } = historyStore.getState()
			const prev = pasts.at(-1)
			if (prev === undefined) return

			const current = store.getState()
			set({ pasts: pasts.slice(0, -1), futures: [current, ...futures] })
			originalSetState(prev, true)
		},
		redo() {
			const { pasts, futures } = historyStore.getState()
			const next = futures.at(0)
			if (next === undefined) return

			const current = store.getState()
			set({ pasts: [...pasts, current], futures: futures.slice(1) })
			originalSetState(next, true)
		},
		clear() {
			set({ pasts: [], futures: [] })
		},
		pause() {
			set({ isPaused: true })
		},
		resume() {
			set({ isPaused: false })
		},
	}))

	function recordState(current: T, next: T): void {
		const { isPaused, pasts, limit: histLimit } = historyStore.getState()
		if (isPaused) return
		if (shouldPush && !shouldPush(current, next)) return

		const updated = [...pasts, current]
		historyStore.setState({
			pasts: updated.length > histLimit ? updated.slice(-histLimit) : updated,
			futures: [],
		})
	}

	function wrappedSetState(
		partial: T | Partial<T> | ((state: T) => T | Partial<T>),
		replace?: boolean,
		setOptions?: SetOptions,
	): void {
		const current = store.getState()
		const nextPartial = typeof partial === 'function' ? partial(current) : partial
		const next = { ...current, ...nextPartial }

		if (!setOptions?.skipHistory) {
			recordState(current, next)
		}

		if (replace === true) {
			originalSetState(next, true)
		} else {
			originalSetState(partial)
		}
	}

	function set(partial: Partial<T> | ((state: T) => Partial<T>), setOptions?: SetOptions): void {
		wrappedSetState(partial, undefined, setOptions)
	}

	return {
		...store,
		setState: wrappedSetState,
		set,
		history: historyStore,
	}
}

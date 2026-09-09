import { createHistoryStack } from '@ez-kit/store-core/history'
import { createStore } from 'zustand/vanilla'

import type { HistoryActionTag, HistoryOptions, HistoryState } from './types'
import type { HistoryApi } from '@ez-kit/store-core/history'
import type { StateCreator, StoreApi, StoreMutatorIdentifier } from 'zustand/vanilla'

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

const withHistoryImpl: WithHistoryImpl =
	(initializer, options = {}) =>
	(set, get, api) => {
		type T = ReturnType<typeof get>
		type HState = HistoryState<T>

		let recordingEnabled = false

		// Loose alias so we can pass through the optional `action` third argument
		// without fighting the StateCreator's `set` overload set.
		const rawSet = set as (partial: T | Partial<T>, replace?: boolean, action?: HistoryActionTag) => void

		// `createHistoryStack`'s constructor calls `onStateChange` before returning, so the
		// zustand sub-store below must exist first. Its `undo`/`redo`/... fields close over this
		// binding rather than calling it directly — by the time any of them is invoked, the
		// `const` below has long since initialized.
		const historyStore: StoreApi<HState> = createStore<HState>()(() => ({
			pasts: [],
			futures: [],
			limit: 0,
			isPaused: false,
			undo: () => {
				historyApi.undo()
			},
			redo: () => {
				historyApi.redo()
			},
			goto: (index: number) => {
				historyApi.goto(index)
			},
			clear: () => {
				historyApi.clear()
			},
			pause: () => {
				historyApi.pause()
			},
			resume: () => {
				historyApi.resume()
			},
			skip: (fn: () => void) => {
				historyApi.skip(fn)
			},
		}))

		// Seed values above are inert: `createHistoryStack` publishes the real snapshot
		// synchronously below, which `setState` merges in before this store is ever read.
		const historyApi: HistoryApi<T, HistoryActionTag> = createHistoryStack<T, HistoryActionTag>(
			{
				read: () => get(),
				write: (state) => {
					rawSet(state, true)
				},
				onStateChange: (snapshot) => {
					historyStore.setState(snapshot)
				},
			},
			options,
		)

		function recordWrite(prev: T, next: T, action: HistoryActionTag | undefined): void {
			if (!recordingEnabled) return
			historyApi.record(prev, next, action)
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

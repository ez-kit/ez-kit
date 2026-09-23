import { createHistoryStack, isSameSlice } from '@ez-kit/store-core/history'
import { createStore } from 'zustand/vanilla'

import { registerSliceReader } from './slice-reader'

import type { HistoryActionTag, HistoryOptions, StoreHistory } from './types'
import type { HistoryApi } from '@ez-kit/store-core/history'
import type { StateCreator, StoreApi, StoreMutatorIdentifier } from 'zustand/vanilla'

/**
 * `A` is the mutator's slot for the `partialize` slice. The initializer's own mutator list cannot
 * name it (it is inferred from the options, after the initializer), so it arrives there as `unknown`
 * and falls back to the full state, exactly as before `partialize` existed.
 */
type WithHistoryStore<S, A> = S extends { getState: () => infer T }
	? S & { history: StoreApi<StoreHistory<unknown extends A ? T : A>> }
	: S

declare module 'zustand/vanilla' {
	/* eslint-disable @typescript-eslint/consistent-type-definitions -- declaration merging requires `interface` */
	interface StoreMutators<S, A> {
		'ez-kit/history': WithHistoryStore<S, A>
	}
	/* eslint-enable @typescript-eslint/consistent-type-definitions */
}

type WithHistory = <
	T,
	Mps extends [StoreMutatorIdentifier, unknown][] = [],
	Mcs extends [StoreMutatorIdentifier, unknown][] = [],
	TSlice = T,
>(
	initializer: StateCreator<T, [...Mps, ['ez-kit/history', unknown]], Mcs>,
	options?: HistoryOptions<T, TSlice>,
) => StateCreator<T, Mps, [['ez-kit/history', TSlice], ...Mcs]>

type WithHistoryImpl = <T, TSlice>(initializer: StateCreator<T>, options?: HistoryOptions<T, TSlice>) => StateCreator<T>

const withHistoryImpl: WithHistoryImpl =
	<T, TSlice>(initializer: StateCreator<T>, options: HistoryOptions<T, TSlice> = {}): StateCreator<T> =>
	(set, get, api) => {
		type HState = StoreHistory<TSlice>

		const { partialize, ...stackOptions } = options

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
		// Without `partialize` a step is the whole state and restoring one replaces it — merging would
		// leave behind any key the step does not have. With it, a step is only the tracked slice, so
		// restoring one has to merge: replacing would wipe every field outside it.
		const historyApi: HistoryApi<TSlice, HistoryActionTag> = createHistoryStack<TSlice, HistoryActionTag>(
			partialize
				? {
						read: () => partialize(get()),
						write: (slice) => {
							rawSet(slice as Partial<T>, false)
						},
						onStateChange: (snapshot) => {
							historyStore.setState(snapshot)
						},
					}
				: {
						read: () => get() as unknown as TSlice,
						write: (state) => {
							rawSet(state as unknown as T, true)
						},
						onStateChange: (snapshot) => {
							historyStore.setState(snapshot)
						},
					},
			stackOptions,
		)

		if (partialize) registerSliceReader(historyStore, partialize)

		function recordWrite(prev: T, next: T, action: HistoryActionTag | undefined): void {
			if (!recordingEnabled || historyApi.isPaused) return
			if (!partialize) {
				historyApi.record(prev as unknown as TSlice, next as unknown as TSlice, action)
				return
			}

			const prevSlice = partialize(prev)
			const nextSlice = partialize(next)
			// A write outside the slice (a selection, an error flag) would otherwise push a step identical
			// to the one before it, and `undo` would spend a press on it with nothing visible happening.
			if (isSameSlice(prevSlice, nextSlice)) return
			historyApi.record(prevSlice, nextSlice, action)
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

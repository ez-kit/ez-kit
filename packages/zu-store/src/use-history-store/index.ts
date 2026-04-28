import { useStore } from 'zustand'

import type { HistoryState, HistoryStore } from '../middlewares/with-history/types'

export function useHistoryStore<T extends object>(store: HistoryStore<T>): HistoryState<T>
export function useHistoryStore<T extends object, S>(store: HistoryStore<T>, selector: (state: HistoryState<T>) => S): S
export function useHistoryStore<T extends object, S>(
	store: HistoryStore<T>,
	selector?: (state: HistoryState<T>) => S,
): HistoryState<T> | S {
	const identity = (s: HistoryState<T>): HistoryState<T> => s
	return useStore(store.history, selector ?? (identity as (s: HistoryState<T>) => S))
}

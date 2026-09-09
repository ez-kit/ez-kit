'use client'

import { useStore } from 'zustand'

import { useHistory } from './use-history'

import type { HistoryState } from './types'
import type { StoreApi } from 'zustand/vanilla'

export type Timeline<T> = {
	/** `[...pasts, current, ...futures]` — the linear timeline `goto(index)` addresses. */
	steps: readonly T[]
	/** Where the store sits on `steps` (`pasts.length`). `steps[index] === current`. */
	index: number
	/** The live state, shaped like a step. */
	current: T
	/** Jumps to an absolute position on `steps`; out-of-range indices clamp. */
	goto: (index: number) => void
}

/**
 * The timeline view of a history store, for the UIs that render it — a step strip, a "N of M"
 * read-out, anything driving `goto()`.
 *
 * Deliberately a hook of its own rather than more fields on {@link useHistory}: assembling `current`
 * means subscribing to the store's whole state, so the caller re-renders on every write, undoable or
 * not. Folded into `useHistory`, that cost would land on every caller, including a toolbar that only
 * wanted `undo` / `redo`. Here it lands only on a caller that renders the state anyway.
 */
export function useTimeline<T>(store: StoreApi<T> & { history: StoreApi<HistoryState<T>> }): Timeline<T> {
	const { pasts, futures, goto } = useHistory(store)
	const current = useStore(store)

	return { steps: [...pasts, current, ...futures], index: pasts.length, current, goto }
}

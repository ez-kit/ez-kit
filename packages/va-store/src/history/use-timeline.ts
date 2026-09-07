'use client'

import { useSnapshot } from 'valtio'

import { useHistory } from './use-history'

import type { StoreHistory } from './with-history'

/** The key `withHistory` hangs its own API off — never part of a recorded state, so never part of a step. */
const HISTORY_KEY = 'history'

export type Timeline<T> = {
	/** `[...pasts, current, ...futures]` — the linear timeline `goto(index)` addresses. */
	steps: readonly T[]
	/** Where the store sits on `steps` (`pasts.length`). `steps[index] === current`. */
	index: number
	/** The live state, shaped like a step: the store's own fields, without `history`. */
	current: T
	/** Jumps to an absolute position on `steps`; out-of-range indices clamp. */
	goto: (index: number) => void
}

/**
 * The timeline view of a history store, for the UIs that render it — a step strip, a "N of M"
 * read-out, anything driving `goto()`.
 *
 * Deliberately a hook of its own rather than more fields on `useHistory`: assembling `current` means
 * `useSnapshot(store)`, and valtio re-renders on **any** store write once a component snapshots the
 * store — even if it reads nothing off that snapshot (an empty access set reads as "changed"). Folded
 * into `useHistory`, that cost would land on every caller, including a toolbar that only wanted
 * `undo`/`redo`. Here it lands only on a caller that renders the state anyway.
 */
export function useTimeline<T extends object>(store: T & { history: StoreHistory<T> }): Timeline<T> {
	const { pasts, futures, goto } = useHistory(store)
	// Stack entries are declared `T` (see `useHistory` on why that cast is the honest shape); `current`
	// has to be the same shape for `steps` to type as one timeline.
	const { [HISTORY_KEY]: _history, ...rest } = useSnapshot(store) as unknown as T & {
		history: StoreHistory<T>
	}
	const current = rest as T

	return { steps: [...pasts, current, ...futures], index: pasts.length, current, goto }
}

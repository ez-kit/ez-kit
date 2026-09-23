'use client'

import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { readSlice } from './slice-reader'
import { useHistory } from './use-history'

import type { StoreHistory } from './with-history'

/** The key `withHistory` hangs its own API off — never part of a recorded state, so never part of a step. */
const HISTORY_KEY = 'history'

export type Timeline<T> = {
	/** `[...pasts, current, ...futures]` — the linear timeline `goto(index)` addresses. */
	steps: readonly T[]
	/** Where the store sits on `steps` (`pasts.length`). `steps[index] === current`. */
	index: number
	/** The live state, shaped like a step: the store's own fields, without `history` — or its `partialize` slice. */
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
export function useTimeline<T extends object, TSlice extends object = T>(
	store: T & { history: StoreHistory<TSlice> },
): Timeline<TSlice> {
	const { pasts, futures, goto } = useHistory(store)
	// Stack entries are declared `TSlice` (see `useHistory` on why that cast is the honest shape);
	// `current` has to be the same shape for `steps` to type as one timeline.
	const snap = useSnapshot(store) as unknown as T & { history: StoreHistory<TSlice> }
	// `partialize` and the key strip both build a fresh object; memoised on the snapshot, which Valtio
	// keeps at one reference until the next write, so `current` holds its identity between writes.
	const current = useMemo(() => {
		const { [HISTORY_KEY]: _history, ...rest } = snap
		return readSlice(store.history, rest) as TSlice
	}, [store.history, snap])

	return { steps: [...pasts, current, ...futures], index: pasts.length, current, goto }
}

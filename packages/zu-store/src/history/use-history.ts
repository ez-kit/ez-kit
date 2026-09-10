'use client'

import { useStore } from 'zustand'

import type { StoreHistory } from './types'
import type { StoreApi } from 'zustand/vanilla'

/**
 * Reads the `history` sub-store (so `pasts` / `futures` / `limit` / `isPaused` re-render the caller
 * when they change) and adds the `canUndo` / `canRedo` convenience flags — a single object a
 * toolbar can destructure from.
 *
 * The undo/redo/goto controls live in that sub-store's state alongside the stacks, so this is one
 * subscription, not two — and it is a subscription to the history sub-store only. A write the stack
 * never records (paused, `skip`ped, or filtered out by `shouldRecord`) leaves a toolbar built on
 * this hook alone untouched; use {@link useTimeline} where the store's own state has to render.
 */
export function useHistory<T>(
	store: StoreApi<T> & { history: StoreApi<StoreHistory<T>> },
): StoreHistory<T> & { canUndo: boolean; canRedo: boolean } {
	const state = useStore(store.history)

	return {
		...state,
		canUndo: state.pasts.length > 0,
		canRedo: state.futures.length > 0,
	}
}

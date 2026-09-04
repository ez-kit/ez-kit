'use client'

import { useSnapshot } from 'valtio'

import type { StoreHistory } from './with-history'
import type { HistorySnapshot } from '@ez-kit/store-core/history'

/**
 * Reads `store.history.state` through `useSnapshot` (so `pasts`/`futures`/`limit`/`isPaused` re-render
 * the caller when they change) and flattens it alongside `store.history`'s methods and `canUndo` /
 * `canRedo` convenience flags — a single object a component can destructure from.
 */
export function useHistory<T extends object>(
	store: T & { history: StoreHistory<T> },
): StoreHistory<T> & HistorySnapshot<T> & { canUndo: boolean; canRedo: boolean } {
	const { history } = store
	// `useSnapshot` deep-snapshots `pasts`/`futures` elements too (`Snapshot<T>` per entry), which is a
	// stricter shape than the plain `T` `HistorySnapshot<T>` declares — the runtime values line up (a
	// deep-frozen `T` still satisfies `T` for the plain-data shapes this stack holds), only the type
	// doesn't express it, so this is a deliberate escape hatch rather than a real mismatch.
	const snap = useSnapshot(history.state) as unknown as HistorySnapshot<T>

	return {
		...history,
		...snap,
		canUndo: snap.pasts.length > 0,
		canRedo: snap.futures.length > 0,
	}
}

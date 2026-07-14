import { useStore as useZustandStore } from 'zustand'

import type { StoreApi } from 'zustand/vanilla'

/**
 * Sentinel selector that asks {@link useRead} for the raw store handle instead of a state read.
 * Stable identity so it can be compared by reference. Never invoked.
 */
export const RAW_SELECTOR = (state: unknown): unknown => state

/**
 * Constant selector used on the {@link RAW_SELECTOR} path. Zustand compares the selected value with
 * `Object.is`, so a selector that always returns the same constant never triggers a re-render — the
 * raw-handle read stays passive, matching `createContextStore`'s `useContextStore`.
 *
 * This does still register a (no-op) subscription, where a bare `useContext` read would not. That is
 * the price of routing every read through one `useRead` injection: the hook must be called
 * unconditionally, and the core cache owns the instance lookup.
 */
const NO_STATE_SELECTOR = (): null => null

/**
 * The single Zustand-specific cache injection (store-core's `useRead`). Reads always flow through
 * Zustand's `useStore`, so the hook is called unconditionally (rules-of-hooks safe). When the
 * {@link RAW_SELECTOR} sentinel is passed, the raw store handle is returned without subscribing to
 * state.
 */
export function useRead<S>(store: StoreApi<unknown>, selector: (snap: unknown) => S): S {
	const isRaw = selector === RAW_SELECTOR
	const selected = useZustandStore(store, isRaw ? NO_STATE_SELECTOR : selector)
	return isRaw ? (store as S) : (selected as S)
}

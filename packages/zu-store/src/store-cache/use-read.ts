import { useStore as useZustandStore } from 'zustand'

import type { StoreApi } from 'zustand/vanilla'

/**
 * The single Zustand-specific cache injection (store-core's `useRead`). Reads flow through Zustand's
 * `useStore`, so the selected value is compared with `Object.is` and only a real change re-renders.
 *
 * The raw store handle is deliberately **not** served from here: routing it through this hook would
 * register a (no-op) subscription where a bare context read registers none. `createCachedStore`'s
 * `useStore()` reads the group instance from context directly instead.
 */
export function useRead<S>(store: StoreApi<unknown>, selector: (snap: unknown) => S): S {
	return useZustandStore(store, selector)
}

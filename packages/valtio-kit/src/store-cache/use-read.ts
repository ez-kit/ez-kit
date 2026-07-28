import { useSnapshot as useValtioSnapshot } from 'valtio'

/**
 * The single Valtio-specific cache injection (store-core's `useRead`). Reads flow through Valtio's
 * `useSnapshot`, which tracks the properties the selector actually touches.
 *
 * The raw proxy is deliberately **not** served from here. Routing it through `useSnapshot` with a
 * selector that reads nothing looks passive but is not: proxy-compare treats an untouched snapshot
 * as changed, so every mutation would re-render the caller. `createCachedStore`'s `useStore()`
 * therefore reads the group instance from context directly, registering no subscription at all.
 */
export function useRead<S>(proxy: object, selector: (snap: unknown) => S): S {
	return selector(useValtioSnapshot(proxy))
}

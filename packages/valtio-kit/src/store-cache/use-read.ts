import { useSnapshot as useValtioSnapshot } from 'valtio'

/**
 * Sentinel selector that asks {@link useRead} for the raw mutable proxy instead of a snapshot read.
 * Stable identity so it can be compared by reference. Never invoked.
 */
export const RAW_SELECTOR = (snap: unknown): unknown => snap

/**
 * The single Valtio-specific cache injection (store-core's `useRead`). Reads always flow through
 * Valtio's `useSnapshot`, so the hook is called unconditionally (rules-of-hooks safe). When the
 * {@link RAW_SELECTOR} sentinel is passed, the raw proxy is returned for direct mutation.
 */
export function useRead<S>(proxy: object, selector: (snap: unknown) => S): S {
	const snap = useValtioSnapshot(proxy)
	if (selector === RAW_SELECTOR) return proxy as S
	return selector(snap)
}

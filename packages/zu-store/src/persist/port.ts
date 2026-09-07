import { setPath } from '@ez-kit/store-core'

import type { StorePort } from '@ez-kit/store-core'
import type { StoreApi } from 'zustand/vanilla'

/**
 * Zustand's side of the {@link StorePort} contract.
 *
 * Both halves differ from Valtio's for the same reason: a Zustand store is a handle, and its state
 * is replaced rather than mutated. Reads go through `getState()`, and a write rebuilds the spine of
 * every path it touches into a NEW state object — an in-place mutation would notify nobody and
 * would defeat the `Object.is` comparison every selector relies on.
 *
 * The whole batch becomes ONE `setState`, so a hydration that fills five fields renders once and
 * a `withHistory` middleware above it records one entry, not five.
 */
export const zustandPort: StorePort<StoreApi<object>> = {
	getState: (store) => store.getState(),
	write: (store, writes) => {
		const current = store.getState()
		let next = current
		for (const { path, value } of writes) {
			next = setPath(next, path, value)
		}
		// `setPath` returns the same object when nothing actually changed; don't notify for a no-op.
		if (next === current) return
		store.setState(next)
	},
	subscribe: (store, onChange) => store.subscribe(onChange),
}

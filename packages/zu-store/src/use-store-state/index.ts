import { useCallback } from 'react'
import { useStore } from 'zustand'

import type { StoreApi } from 'zustand/vanilla'

export function useStoreState<TState, K extends keyof TState>(
	store: StoreApi<TState>,
	key: K,
): [TState[K], (value: TState[K]) => void] {
	const value = useStore(store, (state) => state[key])

	// Memoised so the setter can be used as an effect dependency and passed to memoised children
	// without invalidating them on every render. Zustand's `setState` merges shallowly, so the
	// single-key patch leaves every other field untouched.
	const setValue = useCallback(
		(newValue: TState[K]) => {
			store.setState({ [key]: newValue } as unknown as Partial<TState>)
		},
		[store, key],
	)

	return [value, setValue]
}

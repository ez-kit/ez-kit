import { useStore } from 'zustand'

import type { StoreApi } from 'zustand/vanilla'

export function useStoreState<TState, K extends keyof TState>(
	store: StoreApi<TState>,
	key: K,
): [TState[K], (value: TState[K]) => void] {
	const value = useStore(store, (state) => state[key])

	const setValue = (newValue: TState[K]) => {
		store.setState((prev) => ({ ...prev, [key]: newValue }))
	}

	return [value, setValue]
}

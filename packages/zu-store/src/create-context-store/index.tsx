import { createContext, type PropsWithChildren, type ReactElement, useContext, useRef } from 'react'
import { useStore as useZustandStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import type { ExtractState, StoreApi } from 'zustand/vanilla'

const MISSING_PROVIDER_ERROR = 'Missing Provider for createContextStore'

/** Seed envelope passed to a `createContextStore` factory. Reserves room for a future controlled `value`. */
export type ContextStoreInit<TDefaultValue> = {
	defaultValue: TDefaultValue
}

export type CreateContextStoreFactory<TStore extends StoreApi<unknown>, TDefaultValue> = (
	init: ContextStoreInit<TDefaultValue>,
) => TStore

/** `defaultValue` is required when the seed has required fields, optional when it doesn't. */
type ProviderProps<TDefaultValue> = undefined extends TDefaultValue
	? { defaultValue?: TDefaultValue }
	: { defaultValue: TDefaultValue }

type ItemProps<TStore extends StoreApi<unknown>, TSelected> = {
	selector: (state: ExtractState<TStore>) => TSelected
	children: (state: TSelected) => ReactElement
}

export type CreateContextStoreResult<TStore extends StoreApi<unknown>, TDefaultValue> = {
	Provider: (props: PropsWithChildren<ProviderProps<TDefaultValue>>) => ReactElement
	/**
	 * Write path / escape hatch: the raw Zustand store handle. It does **not** subscribe the calling
	 * component — pair it with `useSelector()` to render.
	 */
	useStore: () => TStore
	/** Reactive read: subscribes to the value returned by `selector`, compared by reference. */
	useSelector: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	/** As `useSelector`, but compares the selected value shallowly — for object/array selections. */
	useShallowSelector: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	Item: <TSelected>(props: ItemProps<TStore, TSelected>) => ReactElement
}

function getStoreFromContext<TStore extends StoreApi<unknown>>(store: TStore | null): TStore {
	if (!store) {
		throw new Error(MISSING_PROVIDER_ERROR)
	}

	return store
}

export function createContextStore<TStore extends StoreApi<unknown>, TDefaultValue = undefined>(
	createStore: CreateContextStoreFactory<TStore, TDefaultValue>,
): CreateContextStoreResult<TStore, TDefaultValue> {
	const StoreContext = createContext<TStore | null>(null)

	function Provider(props: PropsWithChildren<ProviderProps<TDefaultValue>>): ReactElement {
		const { children, defaultValue } = props as PropsWithChildren<{ defaultValue: TDefaultValue }>
		const storeRef = useRef<TStore | null>(null)

		storeRef.current ??= createStore({ defaultValue })

		return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>
	}

	function useStore(): TStore {
		const store = getStoreFromContext(useContext(StoreContext))
		return store
	}

	function useSelector<TSelected>(selector: (state: ExtractState<TStore>) => TSelected): TSelected {
		const store = useStore()
		return useZustandStore(store, selector)
	}

	function useShallowSelector<TSelected>(selector: (state: ExtractState<TStore>) => TSelected): TSelected {
		const store = useStore()
		return useZustandStore(store, useShallow(selector))
	}

	function Item<TSelected>({ selector, children }: ItemProps<TStore, TSelected>): ReactElement {
		return children(useSelector(selector))
	}

	return {
		Provider,
		useStore,
		useSelector,
		useShallowSelector,
		Item,
	}
}

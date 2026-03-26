import { createContext, type PropsWithChildren, type ReactElement, useContext, useRef } from 'react'
import { useStore as useZustandStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import type { ExtractState, StoreApi } from 'zustand/vanilla'

const MISSING_PROVIDER_ERROR = 'Missing Provider for createContextStore'

export type CreateContextStoreFactory<TStore extends StoreApi<unknown>, TInitProps extends object> = (
	initProps: TInitProps,
) => TStore

interface ItemProps<TStore extends StoreApi<unknown>, TSelected> {
	selector: (state: ExtractState<TStore>) => TSelected
	children: (state: TSelected) => ReactElement
}

interface CreateContextStoreResult<TStore extends StoreApi<unknown>, TInitProps extends object> {
	Provider: (props: PropsWithChildren<TInitProps>) => ReactElement
	useStore: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	useShallowStore: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	Item: <TSelected>(props: ItemProps<TStore, TSelected>) => ReactElement
}

function getStoreFromContext<TStore extends StoreApi<unknown>>(store: TStore | null): TStore {
	if (!store) {
		throw new Error(MISSING_PROVIDER_ERROR)
	}

	return store
}

export function createContextStore<TStore extends StoreApi<unknown>, TInitProps extends object = Record<string, never>>(
	createStore: CreateContextStoreFactory<TStore, TInitProps>,
): CreateContextStoreResult<TStore, TInitProps> {
	const StoreContext = createContext<TStore | null>(null)

	function Provider(props: PropsWithChildren<TInitProps>): ReactElement {
		const { children, ...initProps } = props
		const storeRef = useRef<TStore | null>(null)

		storeRef.current ??= createStore(initProps as TInitProps)

		return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>
	}

	function useStore<TSelected>(selector: (state: ExtractState<TStore>) => TSelected): TSelected {
		const store = getStoreFromContext(useContext(StoreContext))
		return useZustandStore(store, selector)
	}

	function useShallowStore<TSelected>(selector: (state: ExtractState<TStore>) => TSelected): TSelected {
		const store = getStoreFromContext(useContext(StoreContext))
		return useZustandStore(store, useShallow(selector))
	}

	function Item<TSelected>({ selector, children }: ItemProps<TStore, TSelected>): ReactElement {
		return children(useStore(selector))
	}

	return {
		Provider,
		useStore,
		useShallowStore,
		Item,
	}
}

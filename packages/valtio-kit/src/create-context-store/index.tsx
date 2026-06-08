import { createContext, type PropsWithChildren, type ReactElement, useContext, useRef } from 'react'
import { useSnapshot as useValtioSnapshot, type Snapshot } from 'valtio'

const MISSING_PROVIDER_ERROR = 'Missing Provider for createContextStore'

export type CreateContextStoreFactory<TState extends object, TInitProps extends object> = (
	initProps: TInitProps,
) => TState

export type UseSnapshotOptions = {
	sync?: boolean
}

type ItemProps<TState extends object> = {
	children: (snapshot: Snapshot<TState>) => ReactElement
}

export type CreateContextStoreResult<TState extends object, TInitProps extends object> = {
	Provider: (props: PropsWithChildren<TInitProps>) => ReactElement
	/** Returns the raw, mutable Valtio proxy. Mutate it directly (e.g. `state.count++`). */
	useStore: () => TState
	/** Returns the readonly, auto-tracked snapshot. Forwards Valtio's `useSnapshot` options. */
	useSnapshot: (options?: UseSnapshotOptions) => Snapshot<TState>
	Item: (props: ItemProps<TState>) => ReactElement
}

function getStoreFromContext<TState extends object>(store: TState | null): TState {
	if (!store) {
		throw new Error(MISSING_PROVIDER_ERROR)
	}

	return store
}

export function createContextStore<
	TState extends object,
	TInitProps extends object = Record<string, never>,
>(createStore: CreateContextStoreFactory<TState, TInitProps>): CreateContextStoreResult<TState, TInitProps> {
	const StoreContext = createContext<TState | null>(null)

	function Provider(props: PropsWithChildren<TInitProps>): ReactElement {
		const { children, ...initProps } = props
		const storeRef = useRef<TState | null>(null)

		storeRef.current ??= createStore(initProps as TInitProps)

		return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>
	}

	function useContextStore(): TState {
		return getStoreFromContext(useContext(StoreContext))
	}

	function useStore(): TState {
		return useContextStore()
	}

	function useSnapshot(options?: UseSnapshotOptions): Snapshot<TState> {
		const store = useContextStore()
		return useValtioSnapshot(store, options)
	}

	function Item({ children }: ItemProps<TState>): ReactElement {
		return children(useSnapshot())
	}

	return {
		Provider,
		useStore,
		useSnapshot,
		Item,
	}
}

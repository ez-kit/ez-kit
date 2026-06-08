import { createContext, type PropsWithChildren, type ReactElement, useContext, useRef } from 'react'
import { useSnapshot as useValtioSnapshot, type Snapshot } from 'valtio'

const MISSING_PROVIDER_ERROR = 'Missing Provider for createContextStore'

/** Seed envelope passed to a `createContextStore` factory. Reserves room for a future controlled `value`. */
export type ContextStoreInit<TDefaultValue> = {
	defaultValue: TDefaultValue
}

export type CreateContextStoreFactory<TState extends object, TDefaultValue> = (
	init: ContextStoreInit<TDefaultValue>,
) => TState

export type UseSnapshotOptions = {
	sync?: boolean
}

/** `defaultValue` is required when the seed has required fields, optional when it doesn't. */
type ProviderProps<TDefaultValue> = undefined extends TDefaultValue
	? { defaultValue?: TDefaultValue }
	: { defaultValue: TDefaultValue }

/** Render-prop argument for `Item`: `snap` for reads, `store` (raw proxy) for writes. */
export type ItemRenderArg<TState extends object> = {
	snap: Snapshot<TState>
	store: TState
}

type ItemProps<TState extends object> = {
	children: (arg: ItemRenderArg<TState>) => ReactElement
}

export type CreateContextStoreResult<TState extends object, TDefaultValue> = {
	Provider: (props: PropsWithChildren<ProviderProps<TDefaultValue>>) => ReactElement
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

export function createContextStore<TState extends object, TDefaultValue = undefined>(
	createStore: CreateContextStoreFactory<TState, TDefaultValue>,
): CreateContextStoreResult<TState, TDefaultValue> {
	const StoreContext = createContext<TState | null>(null)

	function Provider(props: PropsWithChildren<ProviderProps<TDefaultValue>>): ReactElement {
		const { children, defaultValue } = props as PropsWithChildren<{ defaultValue: TDefaultValue }>
		const storeRef = useRef<TState | null>(null)

		storeRef.current ??= createStore({ defaultValue })

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
		return children({ snap: useSnapshot(), store: useStore() })
	}

	return {
		Provider,
		useStore,
		useSnapshot,
		Item,
	}
}

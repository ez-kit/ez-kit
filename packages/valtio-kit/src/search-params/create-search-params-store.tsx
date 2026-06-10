import {
	createContext,
	type PropsWithChildren,
	type ReactElement,
	useContext,
	useEffect,
	useRef,
} from 'react'
import { ref, type Snapshot, useSnapshot as useValtioSnapshot } from 'valtio'

import { applyParamsToProxy, createBinding, type SyncBinding } from './engine/binding'
import { createControl } from './engine/control'
import { useSearchParamsEngine } from './provider'

import type { ContextStoreInit, UseSnapshotOptions } from '../create-context-store'
import type { PersistedValues, SearchParamsOptions, SearchParamsProxy } from './types'

const MISSING_PROVIDER_ERROR = 'Missing Provider for createSearchParamsStore'

type SearchParamsStoreFactory<TState extends object, TDefaultValue> = (
	init: ContextStoreInit<TDefaultValue>,
) => TState

type ProviderProps<TDefaultValue> = undefined extends TDefaultValue
	? { defaultValue?: TDefaultValue }
	: { defaultValue: TDefaultValue }

type Instance<TState extends object> = {
	store: SearchParamsProxy<TState>
	binding: SyncBinding
}

export type CreateSearchParamsStoreResult<TState extends object, TDefaultValue> = {
	Provider: (props: PropsWithChildren<ProviderProps<TDefaultValue>>) => ReactElement
	useStore: () => SearchParamsProxy<TState>
	useSnapshot: (options?: UseSnapshotOptions) => Snapshot<TState>
	Item: (props: {
		children: (arg: { snap: Snapshot<TState>; store: SearchParamsProxy<TState> }) => ReactElement
	}) => ReactElement
}

/**
 * Request-scoped, SSR-correct search-params store. Fuses the `createContextStore` lifecycle
 * with the sync engine: the proxy is created per request and seeded synchronously from the URL
 * (defaultValue, then URL overrides) on both server and client, so server HTML reflects the URL.
 * Must be rendered inside a `StoreSearchParamsProvider`.
 */
export function createSearchParamsStore<TState extends object, TDefaultValue = undefined>(
	factory: SearchParamsStoreFactory<TState, TDefaultValue>,
	options: SearchParamsOptions<TState>,
): CreateSearchParamsStoreResult<TState, TDefaultValue> {
	const StoreContext = createContext<Instance<TState> | null>(null)

	function Provider(props: PropsWithChildren<ProviderProps<TDefaultValue>>): ReactElement {
		const { children, defaultValue } = props as PropsWithChildren<{ defaultValue: TDefaultValue }>
		const engine = useSearchParamsEngine()
		const instanceRef = useRef<Instance<TState> | null>(null)

		if (instanceRef.current === null) {
			const store = factory({ defaultValue })
			const source = store as Record<string, unknown>
			const defaults: PersistedValues = {}
			for (const name of Object.keys(options.fields)) {
				defaults[name] = source[name]
			}
			const binding = createBinding(store, options, defaults)
			source.$searchParams = ref(createControl(binding))
			// Synchronous URL seed → correct server HTML and matching client hydration.
			if (engine) {
				applyParamsToProxy(binding, engine.snapshot())
			}
			instanceRef.current = { store: store as SearchParamsProxy<TState>, binding }
		}

		const instance = instanceRef.current

		useEffect(() => {
			if (!engine) {
				return
			}
			return engine.connect(instance.binding)
		}, [engine, instance])

		return <StoreContext.Provider value={instance}>{children}</StoreContext.Provider>
	}

	function useInstance(): Instance<TState> {
		const instance = useContext(StoreContext)
		if (!instance) {
			throw new Error(MISSING_PROVIDER_ERROR)
		}
		return instance
	}

	function useStore(): SearchParamsProxy<TState> {
		return useInstance().store
	}

	function useSnapshot(options?: UseSnapshotOptions): Snapshot<TState> {
		return useValtioSnapshot(useInstance().store, options)
	}

	function Item({
		children,
	}: {
		children: (arg: { snap: Snapshot<TState>; store: SearchParamsProxy<TState> }) => ReactElement
	}): ReactElement {
		return children({ snap: useSnapshot(), store: useStore() })
	}

	return { Provider, useStore, useSnapshot, Item }
}

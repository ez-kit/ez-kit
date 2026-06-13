import {
	createContext,
	type PropsWithChildren,
	type ReactElement,
	useContext,
	useEffect,
	useRef,
} from 'react'
import { ref, type Snapshot, useSnapshot as useValtioSnapshot } from 'valtio'

import { type FieldsBuilder, resolveFieldSpecs } from './accessor'
import { discoverDecoratedFields } from './decorators'
import { applyParamsToProxy, createBinding, type SyncBinding } from './engine/binding'
import { createControl } from './engine/control'
import { useSearchParamsEngine } from './provider'

import type { ContextStoreInit, UseSnapshotOptions } from '../create-context-store'
import type { FieldDescriptor, SearchParamsOptions, SearchParamsProxy } from './types'

const MISSING_PROVIDER_ERROR = 'Missing Provider for search-params store'

type SearchParamsStoreFactory<TState extends object, TDefaultValue> = (
	init: ContextStoreInit<TDefaultValue>,
) => TState

/** Resolves the synced field descriptors from a freshly created store instance. */
type ResolveDescriptors<TState extends object> = (store: TState) => FieldDescriptor[]

/**
 * Props for the generated `Provider`, with `defaultValue` made optional or required by the seed type.
 *
 * The conditional reads as: "if `undefined` is assignable to `TDefaultValue` (i.e. the store has no
 * required seed — `TDefaultValue` defaults to `undefined`), make `defaultValue` optional; otherwise
 * the caller must pass it." This keeps the prop ergonomic for seedless stores while staying type-safe
 * for stores that genuinely need an initial value.
 */
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
 * Private store core shared by `createDecoratedStore` and `createFieldsStore`. Fuses the
 * `createContextStore` lifecycle with the sync engine: the proxy is created per request and seeded
 * synchronously from the URL (defaultValue, then URL overrides) on both server and client, so server
 * HTML reflects the URL. The two public factories differ only in `resolveDescriptors` — how the
 * synced fields are declared. Not part of the public API.
 */
function createSearchParamsStoreCore<TState extends object, TDefaultValue>(
	factory: SearchParamsStoreFactory<TState, TDefaultValue>,
	resolveDescriptors: ResolveDescriptors<TState>,
	options: SearchParamsOptions,
): CreateSearchParamsStoreResult<TState, TDefaultValue> {
	const StoreContext = createContext<Instance<TState> | null>(null)

	function Provider(props: PropsWithChildren<ProviderProps<TDefaultValue>>): ReactElement {
		const { children, defaultValue } = props as PropsWithChildren<{ defaultValue: TDefaultValue }>
		const engine = useSearchParamsEngine()
		const instanceRef = useRef<Instance<TState> | null>(null)

		if (instanceRef.current === null) {
			const store = factory({ defaultValue })
			const descriptors = resolveDescriptors(store)
			const binding = createBinding(store, descriptors, options)
			;(store as Record<string, unknown>).$searchParams = ref(createControl(binding))
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

/**
 * Request-scoped, SSR-correct search-params store for **class-based** stores. Discovers `@searchParam`
 * fields from the factory-produced instance (auto-recursing composition and inheritance). The proxy is
 * created per request and seeded synchronously from the URL on both server and client. Must be rendered
 * inside a `StoreSearchParamsProvider`. Requires Stage 3 decorators in the consumer's toolchain — for the
 * accessor (no-transpilation) equivalent, use `createFieldsStore`.
 */
export function createSearchParamsStore<TState extends object, TDefaultValue = undefined>(
	factory: SearchParamsStoreFactory<TState, TDefaultValue>,
	options: SearchParamsOptions = {},
): CreateSearchParamsStoreResult<TState, TDefaultValue> {
	return createSearchParamsStoreCore(factory, discoverDecoratedFields, options)
}

/**
 * Request-scoped, SSR-correct search-params store for **plain** proxies. Synced fields are declared by
 * the required `fields` accessor builder (`field(s => s.a.b, parser?, opts?)`) resolved against the
 * factory-produced proxy — no decorator transpilation required. The proxy is created per request and
 * seeded synchronously from the URL on both server and client. Must be rendered inside a
 * `StoreSearchParamsProvider`. For the class/decorator equivalent, use `createDecoratedStore`.
 */
export function createFieldsStore<TState extends object, TDefaultValue = undefined>(
	factory: SearchParamsStoreFactory<TState, TDefaultValue>,
	fields: FieldsBuilder<TState>,
	options: SearchParamsOptions = {},
): CreateSearchParamsStoreResult<TState, TDefaultValue> {
	return createSearchParamsStoreCore(factory, (store) => resolveFieldSpecs(store, fields), options)
}

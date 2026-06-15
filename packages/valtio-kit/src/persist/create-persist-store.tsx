import { createContext, type PropsWithChildren, type ReactElement, useContext, useEffect, useRef } from 'react'
import { type Snapshot, useSnapshot as useValtioSnapshot } from 'valtio'

import { resolveFieldSpecs, type FieldsBuilder } from './accessor'
import { applyKeyed, ApplyMode, createBinding, type PersistBinding } from './binding'
import { discoverPersistFields } from './decorators'
import { usePersistEngines } from './provider'
import { groupBySource, type PersistSpec } from './spec'

import type { ContextStoreInit, UseSnapshotOptions } from '../create-context-store'
import type { PersistOptions } from './types'

const MISSING_PROVIDER_ERROR = 'Missing Provider for persist store'

type PersistStoreFactory<TState extends object, TDefaultValue> = (init: ContextStoreInit<TDefaultValue>) => TState

/** Resolves the persisted specs from a freshly created store instance. */
type ResolveSpecs<TState extends object> = (store: TState) => PersistSpec[]

/**
 * `defaultValue` is optional when the seed has no required fields (`TDefaultValue` includes `undefined`),
 * and required otherwise.
 */
type ProviderProps<TDefaultValue> = undefined extends TDefaultValue
	? { defaultValue?: TDefaultValue }
	: { defaultValue: TDefaultValue }

type SourceBinding = { source: string; binding: PersistBinding }
type Instance<TState extends object> = { store: TState; bindings: SourceBinding[] }

export type CreatePersistStoreResult<TState extends object, TDefaultValue> = {
	Provider: (props: PropsWithChildren<ProviderProps<TDefaultValue>>) => ReactElement
	useStore: () => TState
	useSnapshot: (options?: UseSnapshotOptions) => Snapshot<TState>
	Item: (props: { children: (arg: { snap: Snapshot<TState>; store: TState }) => ReactElement }) => ReactElement
}

/**
 * Private store core shared by the decorator and accessor factories. Fuses the `createContextStore`
 * lifecycle with the persist engines: the proxy is created per request, its specs grouped by source,
 * one binding created per source, and each binding seeded synchronously from its source's engine
 * snapshot (so server HTML reflects the substrate) then connected on mount. Not part of the public API.
 */
function createPersistStoreCore<TState extends object, TDefaultValue>(
	factory: PersistStoreFactory<TState, TDefaultValue>,
	resolveSpecs: ResolveSpecs<TState>,
	options: PersistOptions,
): CreatePersistStoreResult<TState, TDefaultValue> {
	const StoreContext = createContext<Instance<TState> | null>(null)

	function Provider(props: PropsWithChildren<ProviderProps<TDefaultValue>>): ReactElement {
		const { children, defaultValue } = props as PropsWithChildren<{ defaultValue: TDefaultValue }>
		const engines = usePersistEngines()
		const instanceRef = useRef<Instance<TState> | null>(null)

		if (instanceRef.current === null) {
			const store = factory({ defaultValue })
			const bySource = groupBySource(resolveSpecs(store))
			const bindings: SourceBinding[] = []
			for (const [source, descriptors] of bySource) {
				const binding = createBinding(store, descriptors, options)
				bindings.push({ source, binding })
				// Synchronous URL seed → correct server HTML and matching client hydration.
				const engine = engines?.get(source)
				if (engine) {
					const seed = engine.snapshot()
					if (!(seed instanceof Promise)) {
						applyKeyed(binding, seed, ApplyMode.Hydrate)
					}
				}
			}
			instanceRef.current = { store, bindings }
		}

		const instance = instanceRef.current

		useEffect(() => {
			if (!engines) {
				return
			}
			const disconnects: (() => void)[] = []
			for (const { source, binding } of instance.bindings) {
				const engine = engines.get(source)
				if (engine) {
					disconnects.push(engine.connect(binding))
				}
			}
			return () => {
				for (const disconnect of disconnects) {
					disconnect()
				}
			}
		}, [engines, instance])

		return <StoreContext.Provider value={instance}>{children}</StoreContext.Provider>
	}

	function useInstance(): Instance<TState> {
		const instance = useContext(StoreContext)
		if (!instance) {
			throw new Error(MISSING_PROVIDER_ERROR)
		}
		return instance
	}

	function useStore(): TState {
		return useInstance().store
	}

	function useSnapshot(snapshotOptions?: UseSnapshotOptions): Snapshot<TState> {
		return useValtioSnapshot(useInstance().store, snapshotOptions)
	}

	function Item({
		children,
	}: {
		children: (arg: { snap: Snapshot<TState>; store: TState }) => ReactElement
	}): ReactElement {
		return children({ snap: useSnapshot(), store: useStore() })
	}

	return { Provider, useStore, useSnapshot, Item }
}

/**
 * Request-scoped, SSR-correct persist store for **class-based** stores using `persistField`/`persistUrl`
 * decorators (discovered automatically). Must be rendered inside a {@link PersistProvider}. For the
 * accessor (no-transpilation) equivalent, use {@link createPersistFields}.
 */
export function createPersistStore<TState extends object, TDefaultValue = undefined>(
	factory: PersistStoreFactory<TState, TDefaultValue>,
	options: PersistOptions = {},
): CreatePersistStoreResult<TState, TDefaultValue> {
	return createPersistStoreCore(factory, discoverPersistFields, options)
}

/**
 * Request-scoped, SSR-correct persist store for **plain** proxies. Persisted fields are declared by the
 * `fields` accessor builder (`field(s => s.a.b, { source, parser?, … })`) — no decorator transpilation
 * required. Must be rendered inside a {@link PersistProvider}.
 */
export function createPersistFields<TState extends object, TDefaultValue = undefined>(
	factory: PersistStoreFactory<TState, TDefaultValue>,
	fields: FieldsBuilder<TState>,
	options: PersistOptions = {},
): CreatePersistStoreResult<TState, TDefaultValue> {
	return createPersistStoreCore(factory, (store) => resolveFieldSpecs(store, fields), options)
}

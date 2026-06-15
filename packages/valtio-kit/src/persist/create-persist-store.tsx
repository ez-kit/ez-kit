import {
	createContext,
	type PropsWithChildren,
	type ReactElement,
	useContext,
	useEffect,
	useRef,
	useSyncExternalStore,
} from 'react'
import { type Snapshot, useSnapshot as useValtioSnapshot } from 'valtio'

import { resolveFieldSpecs, type FieldsBuilder } from './accessor'
import { applyKeyed, ApplyMode, createBinding } from './binding'
import { discoverPersistFields } from './decorators'
import { attachHandles, type SourceBinding } from './handle'
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

/** Tracks when every source's first hydration has been applied (drives `useHydrated`). */
type Hydration = { done: boolean; listeners: Set<() => void> }

type Instance<TState extends object> = { store: TState; bindings: SourceBinding[]; hydration: Hydration }

export type CreatePersistStoreResult<TState extends object, TDefaultValue> = {
	Provider: (props: PropsWithChildren<ProviderProps<TDefaultValue>>) => ReactElement
	useStore: () => TState
	useSnapshot: (options?: UseSnapshotOptions) => Snapshot<TState>
	/**
	 * `false` on the server and the first client render, flipping to `true` once every source's first
	 * read has been applied. For URL-only (synchronous) stores it flips on mount; use it to gate a
	 * skeleton or defer side-effects while async sources (storage) fill in, avoiding a flash/CLS.
	 */
	useHydrated: () => boolean
	Item: (props: { children: (arg: { snap: Snapshot<TState>; store: TState }) => ReactElement }) => ReactElement
}

/**
 * Private store core shared by the decorator and accessor factories. Fuses the `createContextStore`
 * lifecycle with the persist engines: the proxy is created per request, its specs grouped by source,
 * one binding created per source, render-scoped (URL) sources seeded synchronously from their engine
 * snapshot (so server HTML reflects the substrate), then every binding connected on mount. Ambient
 * (storage) sources are NOT seeded in render — they would mismatch SSR — and hydrate on connect.
 * Not part of the public API.
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
				// Synchronous seed for render-scoped (URL) sources only → correct server HTML + matching
				// client hydration. Ambient (storage) sources hydrate on mount to avoid an SSR mismatch.
				const mount = engines?.get(source)
				if (mount?.seedSync) {
					const seed = mount.engine.snapshot()
					if (!(seed instanceof Promise)) {
						applyKeyed(binding, seed, ApplyMode.Hydrate)
					}
				}
			}
			attachHandles(store, bindings)
			instanceRef.current = { store, bindings, hydration: { done: false, listeners: new Set() } }
		}

		const instance = instanceRef.current

		useEffect(() => {
			const disconnects: (() => void)[] = []
			if (engines) {
				for (const { source, binding } of instance.bindings) {
					const mount = engines.get(source)
					if (mount) {
						disconnects.push(mount.engine.connect(binding))
					}
				}
			}
			// Sync sources have hydrated synchronously inside `connect`; mark the store hydrated.
			if (!instance.hydration.done) {
				instance.hydration.done = true
				for (const listener of instance.hydration.listeners) {
					listener()
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

	function useHydrated(): boolean {
		const { hydration } = useInstance()
		return useSyncExternalStore(
			(onChange) => {
				hydration.listeners.add(onChange)
				return () => {
					hydration.listeners.delete(onChange)
				}
			},
			() => hydration.done,
			() => false,
		)
	}

	function Item({
		children,
	}: {
		children: (arg: { snap: Snapshot<TState>; store: TState }) => ReactElement
	}): ReactElement {
		return children({ snap: useSnapshot(), store: useStore() })
	}

	return { Provider, useStore, useSnapshot, useHydrated, Item }
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

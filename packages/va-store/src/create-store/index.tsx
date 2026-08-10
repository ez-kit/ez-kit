import { useServices } from '@ez-kit/store-core/react'
import { createContext, type PropsWithChildren, type ReactElement, useContext, useEffect, useRef } from 'react'
import { useSnapshot as useValtioSnapshot, type Snapshot } from 'valtio'

import type { PluginCleanup, PluginContext, StoreId, StorePlugin } from '@ez-kit/store-core'

/** Names the store in the error, so `createStore(f, { name: 'filters' })` reports `filters`. */
const missingProviderError = (name: string): string => `Missing Provider for ${name}`

/** Synthetic id for a non-cached, singleton store. There is one entry per Provider, hence a fixed `id`. */
const SINGLETON_ID = 'singleton'
const DEFAULT_STORE_NAME = 'store'
const EMPTY_PATH: readonly string[] = []
const IS_SERVER = typeof window === 'undefined'

/** Seed envelope passed to a store factory. Reserves room for a future controlled `value`. */
export type StoreInit<TDefaultValue> = {
	defaultValue: TDefaultValue
}

export type StoreFactory<TState extends object, TDefaultValue> = (init: StoreInit<TDefaultValue>) => TState

export type UseSnapshotOptions = {
	sync?: boolean
}

export type CreateStoreOptions<TState extends object> = {
	/** Group name used to synthesize this store's `StoreId`. Defaults to a stable `'store'`. */
	name?: string
	/** Plugins bound to the Provider's mount: `setup` runs on mount, its cleanup on unmount. */
	plugins?: readonly StorePlugin<TState>[]
}

/** `defaultValue` is required when the seed has required fields, optional when it doesn't. */
type ProviderProps<TDefaultValue> = undefined extends TDefaultValue
	? { defaultValue?: TDefaultValue }
	: { defaultValue: TDefaultValue }

/** Render-prop argument for `Item`: `snap` for reads, `store` (raw proxy, as from `useStore()`) for writes. */
export type ItemRenderArg<TState extends object> = {
	snap: Snapshot<TState>
	store: TState
}

type ItemProps<TState extends object> = {
	children: (arg: ItemRenderArg<TState>) => ReactElement
}

type StoreItemProps<TState extends object> = {
	children: (store: TState) => ReactElement
}

export type CreateStoreResult<TState extends object, TDefaultValue> = {
	Provider: (props: PropsWithChildren<ProviderProps<TDefaultValue>>) => ReactElement
	/** Reactive read: the readonly, auto-tracked snapshot. Forwards Valtio's `useSnapshot` options. */
	useSnapshot: (options?: UseSnapshotOptions) => Snapshot<TState>
	/**
	 * Write path / escape hatch: the raw, mutable Valtio proxy. Mutate it directly (e.g. `state.count++`).
	 * It does **not** subscribe the calling component — pair it with `useSnapshot()` to render.
	 */
	useStore: () => TState
	/** Reading slot: subscribes through `useSnapshot()`, so tracked mutations re-render its children. */
	Item: (props: ItemProps<TState>) => ReactElement
	/**
	 * Write-only slot: hands the raw proxy from `useStore()` to its children without subscribing, so
	 * store mutations never re-render them. It is **not** memoised — it still renders whenever its
	 * parent does.
	 */
	StoreItem: (props: StoreItemProps<TState>) => ReactElement
}

function getStoreFromContext<TState extends object>(store: TState | null, name: string): TState {
	if (!store) throw new Error(missingProviderError(name))
	return store
}

/**
 * Plugin-capable base store factory. Creates the Valtio proxy once per Provider via `useRef`. When
 * `plugins` are declared, each plugin's `setup(proxy, ctx)` runs once on mount and its returned
 * `PluginCleanup` runs on unmount. `ctx.services` resolves app-level services published by an
 * ancestor `ServicesProvider`/`StoreProvider`. `createContextStore` is this factory with no plugins.
 *
 * Reads go through `useSnapshot()`, which returns the auto-tracked readonly snapshot. Writes go
 * through `useStore()`, which hands back the raw mutable proxy without subscribing.
 */
export function createStore<TState extends object, TDefaultValue = undefined>(
	factory: StoreFactory<TState, TDefaultValue>,
	options: CreateStoreOptions<TState> = {},
): CreateStoreResult<TState, TDefaultValue> {
	const StoreContext = createContext<TState | null>(null)
	const plugins = options.plugins ?? []
	const name = options.name ?? DEFAULT_STORE_NAME
	const storeId: StoreId = { path: EMPTY_PATH, name, id: SINGLETON_ID }

	function usePlugins(store: TState, services: PluginContext['services']): void {
		useEffect(() => {
			if (plugins.length === 0) return
			const context: PluginContext = { services, id: storeId, isServer: IS_SERVER }
			const cleanups: PluginCleanup[] = plugins.map((plugin) => plugin.setup(store, context))
			return () => {
				for (const cleanup of cleanups) {
					if (cleanup) cleanup()
				}
			}
		}, [store, services])
	}

	function Provider(props: PropsWithChildren<ProviderProps<TDefaultValue>>): ReactElement {
		const { children, defaultValue } = props as PropsWithChildren<{ defaultValue: TDefaultValue }>
		const services = useServices()
		const storeRef = useRef<TState | null>(null)

		storeRef.current ??= factory({ defaultValue })
		const store = storeRef.current

		usePlugins(store, services)

		return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
	}

	function useStore(): TState {
		return getStoreFromContext(useContext(StoreContext), name)
	}

	function useSnapshot(snapshotOptions?: UseSnapshotOptions): Snapshot<TState> {
		return useValtioSnapshot(useStore(), snapshotOptions)
	}

	function Item({ children }: ItemProps<TState>): ReactElement {
		return children({ snap: useSnapshot(), store: useStore() })
	}

	function StoreItem({ children }: StoreItemProps<TState>): ReactElement {
		return children(useStore())
	}

	return { Provider, useSnapshot, useStore, Item, StoreItem }
}

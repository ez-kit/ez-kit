import { createContext, useContext, useEffect, useState, type Context, type ReactElement, type ReactNode } from 'react'
import { useStore as useZustandStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { createStore } from 'zustand/vanilla'

import { serializeStoreId, toStoreId } from './cache-utils'

import type { CacheInstance, StoreId } from './cache-types'
import type {
	CacheAddress,
	CachedItemProps,
	CachedProviderProps,
	CachedStoreFactory,
	CachedStoreGroup,
	DefineStoreOptions,
} from './types'
import type { ExtractState, StoreApi } from 'zustand/vanilla'

/** Mutable handle to the cache owned by the currently-mounted `cache.Provider` (client-only). */
export type ActiveCacheRef = { current: CacheInstance | null }

type DefineStoreDeps = {
	CacheContext: Context<CacheInstance | null>
	ScopeContext: Context<readonly string[]>
	activeCache: ActiveCacheRef
	cacheGcTime: number
	missingProviderError: string
	registerGroupName: (name: string) => void
}

/** Birth-config cascade: `alwaysCache` wins, else Provider → store group → cache default. */
function resolveGcTime(
	alwaysCache: boolean | undefined,
	providerGcTime: number | undefined,
	groupGcTime: number | undefined,
	cacheGcTime: number,
): number {
	if (alwaysCache === true) return Infinity
	return providerGcTime ?? groupGcTime ?? cacheGcTime
}

/** Pure: `[...scope, ...providerPath]`, fast-paths to `scope` when no provider path is supplied. */
function resolvePath(scope: readonly string[], providerPath: readonly string[] | undefined): readonly string[] {
	if (!providerPath || providerPath.length === 0) return scope
	return [...scope, ...providerPath]
}

export function createDefineStore(deps: DefineStoreDeps) {
	const { CacheContext, ScopeContext, activeCache, cacheGcTime, missingProviderError, registerGroupName } = deps

	return function defineStore<TStore extends StoreApi<unknown>, TDefaultProps extends object = Record<string, never>>(
		name: string,
		factory: CachedStoreFactory<TStore, TDefaultProps>,
		options: DefineStoreOptions = {},
	): CachedStoreGroup<TStore, TDefaultProps> {
		registerGroupName(name)

		const groupGcTime = options.gcTime

		// Per-group context exposing the canonical store. Reactive: replacing the value (via setState)
		// re-renders consumers, which re-subscribe to the new store via `useZustandStore`.
		// We deliberately don't reuse `createContextStore` here — it captures the store via `useRef` and
		// cannot adopt a swapped store mid-life.
		const StoreContext = createContext<TStore | null>(null)
		const MISSING_GROUP_PROVIDER = `Missing <${name}.Provider>`

		function useGroupStoreFromContext(): TStore {
			const store = useContext(StoreContext)
			if (!store) throw new Error(MISSING_GROUP_PROVIDER)
			return store
		}

		function useStore<TSelected>(selector: (state: ExtractState<TStore>) => TSelected): TSelected {
			return useZustandStore(useGroupStoreFromContext(), selector)
		}
		function useShallowStore<TSelected>(selector: (state: ExtractState<TStore>) => TSelected): TSelected {
			return useZustandStore(useGroupStoreFromContext(), useShallow(selector))
		}
		function useContextStore(): TStore {
			return useGroupStoreFromContext()
		}
		function Item<TSelected>({ selector, children }: CachedItemProps<TStore, TSelected>): ReactElement {
			return children(useStore(selector))
		}

		// Per-group typed fallback used only as a placeholder when `useFromCache` has no live entry.
		// Its state is never read — the selector wrapper passes `undefined` to the user when there is no live store.
		const fallbackStore: StoreApi<ExtractState<TStore>> = createStore<ExtractState<TStore>>(
			() => ({}) as ExtractState<TStore>,
		)

		type ProviderInnerProps = {
			storeId: StoreId
			defaultProps: TDefaultProps
			gcTime: number
			children: ReactNode
		}

		/**
		 * Keyed inner Provider — `useState`/`useEffect` reset when the resolved identity (`remountKey`) changes.
		 * Render is side-effect-free w.r.t. the cache: the provisional store is built locally; cache registration
		 * happens in the effect, after commit. A discarded render leaves no cache state to clean up.
		 *
		 * On cache hit during re-mount, the provisional store is replaced by the canonical one in the effect via
		 * `setCanonical`. Because `StoreContext.Provider` propagates the new value reactively (rather than capturing
		 * it via `useRef`), descendants re-subscribe to the canonical store without remounting.
		 */
		function ProviderInner({ storeId, defaultProps, gcTime, children }: ProviderInnerProps): ReactElement {
			const cache = useContext(CacheContext)
			if (!cache) throw new Error(missingProviderError)

			// Lazy: factory runs once per fresh mount; never re-runs during this mount's life.
			const [provisional] = useState<TStore>(() => factory(defaultProps))
			// Canonical store: starts as provisional; effect may swap if another mount already registered.
			const [canonical, setCanonical] = useState<TStore>(provisional)

			useEffect(() => {
				const registered = cache.register(storeId, provisional, gcTime) as TStore
				if (registered !== canonical) setCanonical(registered)
				cache.addObserver(storeId)
				return () => {
					cache.removeObserver(storeId)
				}
				// `storeId` is stable for this keyed mount; intentionally exclude `canonical` to run register exactly once.
				// eslint-disable-next-line react-hooks/exhaustive-deps
			}, [cache])

			return <StoreContext.Provider value={canonical}>{children}</StoreContext.Provider>
		}

		function Provider(props: CachedProviderProps<TDefaultProps>): ReactElement {
			const { id, path, gcTime, alwaysCache, children } = props
			// `defaultProps` lives on one of two conditional branches of `CachedProviderProps`; access via index cast.
			// Safe by the conditional type: when `TDefaultProps` has required fields, the type requires
			// `defaultProps` so it is defined here. When `TDefaultProps` admits `{}`, omission is allowed and the
			// `{}` fallback is a valid value of `TDefaultProps`.
			const providedDefaults = (props as { defaultProps?: TDefaultProps }).defaultProps
			const inheritedScope = useContext(ScopeContext)
			const resolvedPath = resolvePath(inheritedScope, path)
			const resolvedGcTime = resolveGcTime(alwaysCache, gcTime, groupGcTime, cacheGcTime)
			const seedDefaultProps: TDefaultProps = providedDefaults ?? ({} as TDefaultProps)
			const storeId: StoreId = { path: resolvedPath, name, id }
			const remountKey = serializeStoreId(storeId)
			return (
				<ProviderInner
					key={remountKey}
					storeId={storeId}
					defaultProps={seedDefaultProps}
					gcTime={resolvedGcTime}
				>
					{children}
				</ProviderInner>
			)
		}

		function fromCache(target: CacheAddress): TStore | undefined {
			return activeCache.current?.getCachedStore(toStoreId(target, name)) as TStore | undefined
		}

		function useFromCache<TSelected>(
			target: CacheAddress,
			selector: (state: ExtractState<TStore> | undefined) => TSelected,
		): TSelected {
			const cache = useContext(CacheContext)
			if (!cache) throw new Error(missingProviderError)

			const storeKey = serializeStoreId(toStoreId(target, name))

			const liveStore = useZustandStore(
				cache.cachedStores,
				(state) => state.stores.get(storeKey)?.store as StoreApi<ExtractState<TStore>> | undefined,
			)

			const subscribed: StoreApi<ExtractState<TStore>> = liveStore ?? fallbackStore
			return useZustandStore<StoreApi<ExtractState<TStore>>, TSelected>(
				subscribed,
				useShallow((state) => selector(liveStore ? state : undefined)),
			)
		}

		function remove(target: CacheAddress): void {
			activeCache.current?.remove(toStoreId(target, name))
		}

		return {
			Provider,
			useStore,
			useShallowStore,
			useContextStore,
			Item,
			fromCache,
			useFromCache,
			remove,
		}
	}
}

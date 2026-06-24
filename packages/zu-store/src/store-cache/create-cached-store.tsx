import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
	type Context,
	type ReactElement,
	type ReactNode,
} from 'react'
import { useStore as useZustandStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { createStore } from 'zustand/vanilla'

import { serializeStoreId, toStoreId } from './cache-utils'

import type {
	CacheAddress,
	CachedItemProps,
	CachedProviderProps,
	CachedStoreFactory,
	CachedStoreGroup,
	CachedStoreOptions,
} from './types'
import type { StoreId , StorePlugin } from '@ez-kit/store-core'
import type { InstanceCache } from '@ez-kit/store-core/cache'
import type { StoreApi, ExtractState } from 'zustand/vanilla'

/** Mutable handle to the cache owned by the currently-mounted `cache.Provider` (client-only). */
export type ActiveCacheRef = { current: InstanceCache | null }

type CreateCachedStoreDeps = {
	CacheContext: Context<InstanceCache | null>
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

export function wrapCachedStoreGroup(deps: CreateCachedStoreDeps) {
	const { CacheContext, ScopeContext, activeCache, cacheGcTime, missingProviderError, registerGroupName } = deps

	return function createCachedStore<
		TStore extends StoreApi<unknown>,
		TDefaultValue extends object = Record<string, never>,
	>(
		factory: CachedStoreFactory<TStore, TDefaultValue>,
		options: CachedStoreOptions & { plugins?: readonly StorePlugin<TStore>[] },
	): CachedStoreGroup<TStore, TDefaultValue> {
		const { name } = options
		registerGroupName(name)

		const groupGcTime = options.gcTime

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

		// Per-group typed fallback: used as a stable placeholder in `useFromCache` when there is
		// no live entry. Its state is never read — the selector receives `undefined` in that case.
		const fallbackStore: StoreApi<ExtractState<TStore>> = createStore<ExtractState<TStore>>(
			() => ({}) as ExtractState<TStore>,
		)

		type ProviderInnerProps = {
			storeId: StoreId
			defaultValue: TDefaultValue
			gcTime: number
			children: ReactNode
		}

		function ProviderInner({ storeId, defaultValue, gcTime, children }: ProviderInnerProps): ReactElement {
			const cache = useContext(CacheContext)
			if (!cache) throw new Error(missingProviderError)

			// Lazy: factory runs once per fresh mount; never re-runs during this mount's life.
			const [provisional] = useState<TStore>(() => factory({ defaultValue }))
			// Canonical store: starts as provisional; effect may swap if another mount already registered.
			const [canonical, setCanonical] = useState<TStore>(provisional)

			useEffect(() => {
				const registered = cache.getOrCreate(storeId, () => provisional, {
					gcTime,
					plugins: (options.plugins ?? []),
					context: { services: {} as never, id: storeId, isServer: false },
				})
				if (registered !== canonical) setCanonical(registered)
				cache.addObserver(storeId)

				return () => {
					cache.removeObserver(storeId)
				}
				// `storeId` is stable for this keyed mount; intentionally exclude `canonical`.
				// eslint-disable-next-line react-hooks/exhaustive-deps
			}, [cache])

			return <StoreContext.Provider value={canonical}>{children}</StoreContext.Provider>
		}

		function Provider(props: CachedProviderProps<TDefaultValue>): ReactElement {
			const { id, path, gcTime, alwaysCache, children } = props
			const providedDefaults = (props as { defaultValue?: TDefaultValue }).defaultValue
			const inheritedScope = useContext(ScopeContext)
			const resolvedPath = resolvePath(inheritedScope, path)
			const resolvedGcTime = resolveGcTime(alwaysCache, gcTime, groupGcTime, cacheGcTime)
			const seedDefaultValue: TDefaultValue = providedDefaults ?? ({} as TDefaultValue)
			const storeId: StoreId = { path: resolvedPath, name, id }
			const remountKey = serializeStoreId(storeId)
			return (
				<ProviderInner
					key={remountKey}
					storeId={storeId}
					defaultValue={seedDefaultValue}
					gcTime={resolvedGcTime}
				>
					{children}
				</ProviderInner>
			)
		}

		function fromCache(target: CacheAddress): TStore | undefined {
			return activeCache.current?.getInstance(toStoreId(target, name)) as TStore | undefined
		}

		function useFromCache<TSelected>(
			target: CacheAddress,
			selector: (state: ExtractState<TStore> | undefined) => TSelected,
		): TSelected {
			const cache = useContext(CacheContext)
			if (!cache) throw new Error(missingProviderError)

			// Reactively reflect membership changes (entry appears/disappears) via the cache's pub/sub.
			// `useSyncExternalStore` subscribes synchronously at render, so a passive reader never misses
			// an entry created by an earlier-mounted sibling. It does not keep the entry alive.
			const snapshot = useSyncExternalStore(cache.subscribe, cache.getKeysSnapshot, cache.getKeysSnapshot)

			const storeKey = serializeStoreId(toStoreId(target, name))
			const liveStore = useMemo(
				() => cache.getInstance(toStoreId(target, name)) as StoreApi<ExtractState<TStore>> | undefined,
				// `snapshot` ⇒ membership change; `storeKey` ⇒ target change.
				// eslint-disable-next-line react-hooks/exhaustive-deps
				[cache, snapshot, storeKey],
			)

			// When there is no live entry, subscribe to a stable empty store; the selector receives
			// `undefined` so the placeholder's state is never read.
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

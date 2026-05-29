import { useContext, useEffect, useMemo, type Context, type ReactElement } from 'react'
import { useStore as useZustandStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { createStore } from 'zustand/vanilla'

import { createContextStore } from '../create-context-store'

import type { CacheInstance } from './cache'
import type { CachedProviderProps, CachedStoreFactory, CachedStoreGroup, DefineStoreOptions } from './types'
import type { ExtractState, StoreApi } from 'zustand/vanilla'

/** Mutable handle to the cache owned by the currently-mounted `cache.Provider` (client-only). */
export type ActiveCacheRef = { current: CacheInstance | null }

type DefineStoreDeps = {
	CacheContext: Context<CacheInstance | null>
	activeCache: ActiveCacheRef
	cacheGcTime: number
	missingProviderError: string
}

/** Stable dummy store so the second `useStore` in `useFromCache` has a valid api when the entry is absent. */
const EMPTY_STORE = createStore<Record<string, never>>(() => ({}))

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

export function createDefineStore(deps: DefineStoreDeps) {
	const { CacheContext, activeCache, cacheGcTime, missingProviderError } = deps

	return function defineStore<TStore extends StoreApi<unknown>, TDefaultProps extends object = Record<string, never>>(
		name: string,
		factory: CachedStoreFactory<TStore, TDefaultProps>,
		options: DefineStoreOptions = {},
	): CachedStoreGroup<TStore, TDefaultProps> {
		// The caller-provided `name` is the group's namespace — readable in `useCache().keys()`.
		const groupId = name
		const groupGcTime = options.gcTime
		// Reuse createContextStore unchanged: its factory just returns the store we inject.
		const contextStore = createContextStore<TStore, { __injectedStore: TStore }>((props) => props.__injectedStore)

		function useGroupStore(cacheKey: string, defaultProps: TDefaultProps, gcTime: number): TStore {
			const cache = useContext(CacheContext)
			if (!cache) throw new Error(missingProviderError)

			const store = useMemo(
				() => cache.getOrCreate(groupId, cacheKey, () => factory(defaultProps), gcTime) as TStore,
				// defaultProps/gcTime are birth-config — ignored when reusing a live entry, so intentionally excluded.
				// eslint-disable-next-line react-hooks/exhaustive-deps
				[cache, cacheKey],
			)

			useEffect(() => {
				cache.addObserver(groupId, cacheKey)
				return () => {
					cache.removeObserver(groupId, cacheKey)
				}
			}, [cache, cacheKey])

			return store
		}

		function Provider(props: CachedProviderProps<TDefaultProps>): ReactElement {
			const { cacheKey, defaultProps, gcTime, alwaysCache, children } = props
			const resolvedGcTime = resolveGcTime(alwaysCache, gcTime, groupGcTime, cacheGcTime)
			const resolvedDefaultProps = defaultProps ?? ({} as TDefaultProps)
			const store = useGroupStore(cacheKey, resolvedDefaultProps, resolvedGcTime)
			// `key` forces a fresh inner Provider (and its ref) when the cacheKey changes.
			return (
				<contextStore.Provider
					key={cacheKey}
					__injectedStore={store}
				>
					{children}
				</contextStore.Provider>
			)
		}

		function fromCache(cacheKey: string): TStore | undefined {
			return activeCache.current?.getCachedStore(groupId, cacheKey) as TStore | undefined
		}

		function useFromCache<TSelected>(
			cacheKey: string,
			selector: (state: ExtractState<TStore> | undefined) => TSelected,
		): TSelected {
			const cache = useContext(CacheContext)
			if (!cache) throw new Error(missingProviderError)

			const store = useZustandStore(
				cache.cachedStores,
				(state) => state.storesByGroup.get(groupId)?.get(cacheKey) as TStore | undefined,
			)

			return useZustandStore(
				store ?? (EMPTY_STORE as unknown as TStore),
				useShallow((state: ExtractState<TStore>) => selector(store ? state : undefined)),
			)
		}

		function remove(cacheKey: string): void {
			activeCache.current?.remove(groupId, cacheKey)
		}

		return {
			Provider,
			useStore: contextStore.useStore,
			useShallowStore: contextStore.useShallowStore,
			useContextStore: contextStore.useContextStore,
			Item: contextStore.Item,
			fromCache,
			useFromCache,
			remove,
		}
	}
}

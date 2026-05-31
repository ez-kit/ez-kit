import { useContext, useEffect, useMemo, type Context, type ReactElement } from 'react'
import { useStore as useZustandStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { createStore } from 'zustand/vanilla'

import { createContextStore } from '../create-context-store'

import { serializeEntryId, type CacheInstance, type EntryId } from './cache'

import type { CacheTarget, CachedProviderProps, CachedStoreFactory, CachedStoreGroup, DefineStoreOptions } from './types'
import type { ExtractState, StoreApi } from 'zustand/vanilla'

/** Mutable handle to the cache owned by the currently-mounted `cache.Provider` (client-only). */
export type ActiveCacheRef = { current: CacheInstance | null }

type DefineStoreDeps = {
	CacheContext: Context<CacheInstance | null>
	ScopeContext: Context<readonly string[]>
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
	const { CacheContext, ScopeContext, activeCache, cacheGcTime, missingProviderError } = deps

	return function defineStore<TStore extends StoreApi<unknown>, TDefaultProps extends object = Record<string, never>>(
		name: string,
		factory: CachedStoreFactory<TStore, TDefaultProps>,
		options: DefineStoreOptions = {},
	): CachedStoreGroup<TStore, TDefaultProps> {
		// The caller-provided `name` is the group's namespace — readable in `useCache().keys()`.
		const group = name
		const groupGcTime = options.gcTime
		// Reuse createContextStore unchanged: its factory just returns the store we inject.
		const contextStore = createContextStore<TStore, { __injectedStore: TStore }>((props) => props.__injectedStore)

		function useGroupStore(cacheKey: string, resolvedPath: readonly string[], defaultProps: TDefaultProps, gcTime: number): TStore {
			const cache = useContext(CacheContext)
			if (!cache) throw new Error(missingProviderError)

			// Stable string identity: re-resolves on cacheKey OR resolved-path change, ignores array ref churn.
			const entryKey = serializeEntryId({ path: resolvedPath, group, key: cacheKey })

			const store = useMemo(
				() => cache.getOrCreate({ path: resolvedPath, group, key: cacheKey }, () => factory(defaultProps), gcTime) as TStore,
				// defaultProps/gcTime are birth-config — ignored when reusing a live entry, so intentionally excluded.
				// eslint-disable-next-line react-hooks/exhaustive-deps
				[cache, entryKey],
			)

			useEffect(() => {
				const id: EntryId = { path: resolvedPath, group, key: cacheKey }
				cache.addObserver(id)
				return () => {
					cache.removeObserver(id)
				}
				// eslint-disable-next-line react-hooks/exhaustive-deps
			}, [cache, entryKey])

			return store
		}

		function Provider(props: CachedProviderProps<TDefaultProps>): ReactElement {
			const { cacheKey, path, defaultProps, gcTime, alwaysCache, children } = props
			const inheritedScope = useContext(ScopeContext)
			const resolvedPath = path && path.length > 0 ? [...inheritedScope, ...path] : inheritedScope
			const resolvedGcTime = resolveGcTime(alwaysCache, gcTime, groupGcTime, cacheGcTime)
			const resolvedDefaultProps = defaultProps ?? ({} as TDefaultProps)
			const store = useGroupStore(cacheKey, resolvedPath, resolvedDefaultProps, resolvedGcTime)
			// `key` forces a fresh inner Provider (and its ref) when the full resolved identity changes.
			const remountKey = serializeEntryId({ path: resolvedPath, group, key: cacheKey })
			return (
				<contextStore.Provider
					key={remountKey}
					__injectedStore={store}
				>
					{children}
				</contextStore.Provider>
			)
		}

		function fromCache(target: CacheTarget): TStore | undefined {
			return activeCache.current?.getCachedStore({ path: target.path ?? [], group, key: target.key }) as TStore | undefined
		}

		function useFromCache<TSelected>(
			target: CacheTarget,
			selector: (state: ExtractState<TStore> | undefined) => TSelected,
		): TSelected {
			const cache = useContext(CacheContext)
			if (!cache) throw new Error(missingProviderError)

			const entryKey = serializeEntryId({ path: target.path ?? [], group, key: target.key })

			const store = useZustandStore(
				cache.cachedStores,
				(state) => state.stores.get(entryKey)?.store as TStore | undefined,
			)

			return useZustandStore(
				store ?? (EMPTY_STORE as unknown as TStore),
				useShallow((state: ExtractState<TStore>) => selector(store ? state : undefined)),
			)
		}

		function remove(target: CacheTarget): void {
			activeCache.current?.remove({ path: target.path ?? [], group, key: target.key })
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

import type { PropsWithChildren, ReactElement } from 'react'
import type { ExtractState, StoreApi } from 'zustand/vanilla'

export type StoreCacheOptions = {
	/** Default eviction delay in ms after an entry's observer count reaches zero. */
	gcTime?: number
}

export type DefineStoreOptions = {
	/** Store-group default `gcTime`, overriding the cache default. */
	gcTime?: number
}

/** Builds the store instance for a freshly created cache entry, seeded with `defaultProps`. */
export type CachedStoreFactory<TStore extends StoreApi<unknown>, TDefaultProps extends object> = (
	defaultProps: TDefaultProps,
) => TStore

export type CachedProviderProps<TDefaultProps extends object> = PropsWithChildren<{
	/** Identity of the cache entry within this store group. Required. */
	cacheKey: string
	/** Seed values applied only when this `cacheKey` is first created. Ignored on reuse. */
	defaultProps?: TDefaultProps
	/** Birth-config: eviction delay for this entry. Fixed by the first mount of the key. */
	gcTime?: number
	/** Birth-config: pin the entry against automatic eviction (equivalent to `gcTime: Infinity`). */
	alwaysCache?: boolean
}>

export type CachedItemProps<TStore extends StoreApi<unknown>, TSelected> = {
	selector: (state: ExtractState<TStore>) => TSelected
	children: (state: TSelected) => ReactElement
}

/** Handle returned by `defineStore` — a group of keep-alive stores keyed by `cacheKey`. */
export type CachedStoreGroup<TStore extends StoreApi<unknown>, TDefaultProps extends object> = {
	Provider: (props: CachedProviderProps<TDefaultProps>) => ReactElement
	useStore: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	useShallowStore: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	useContextStore: () => TStore
	Item: <TSelected>(props: CachedItemProps<TStore, TSelected>) => ReactElement
	/** Imperative get-if-alive. Returns the live store or `undefined`. Never creates. */
	fromCache: (cacheKey: string) => TStore | undefined
	/** Reactive, passive cross-tree read. Does not keep the store alive. */
	useFromCache: <TSelected>(
		cacheKey: string,
		selector: (state: ExtractState<TStore> | undefined) => TSelected,
	) => TSelected
	/** Remove this group's store for `cacheKey` immediately. */
	remove: (cacheKey: string) => void
}

export type StoreCacheController = {
	keys: () => Map<string, string[]>
	clear: () => void
}

export type StoreCache = {
	Provider: (props: PropsWithChildren) => ReactElement
	useCache: () => StoreCacheController
	defineStore: <TStore extends StoreApi<unknown>, TDefaultProps extends object = Record<string, never>>(
		name: string,
		factory: CachedStoreFactory<TStore, TDefaultProps>,
		options?: DefineStoreOptions,
	) => CachedStoreGroup<TStore, TDefaultProps>
}

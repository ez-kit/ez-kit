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

/** Absolute address of a cache entry within a store group: a tree `path` plus the entry `key`. */
export type CacheTarget = {
	/** Resolved tree location of the entry. Defaults to `[]` (root) when omitted. */
	path?: string[]
	/** Identity of the entry within its store group at `path`. */
	key: string
}

/** Structural coordinate of one live entry, as surfaced by `keys()`. */
export type CacheCoordinate = {
	path: string[]
	group: string
	key: string
}

/** Nested view of live entries: path segments nest as objects; each leaf maps group → cacheKeys. */
export type CacheTree = {
	[segment: string]: CacheTree | string[]
}

export type ScopeProps = PropsWithChildren<{
	/** Path segments contributed to descendants. Nested `Scope`s concatenate, outermost first. */
	path: string[]
}>

export type CachedProviderProps<TDefaultProps extends object> = PropsWithChildren<{
	/** Identity of the cache entry within this store group at the resolved path. Required. */
	cacheKey: string
	/** Path segments appended after the inherited `Scope` path: `[...scope, ...path]`. */
	path?: string[]
	/** Seed values applied only when this entry is first created. Ignored on reuse. */
	defaultProps?: TDefaultProps
	/** Birth-config: eviction delay for this entry. Fixed by the first mount of the identity. */
	gcTime?: number
	/** Birth-config: pin the entry against automatic eviction (equivalent to `gcTime: Infinity`). */
	alwaysCache?: boolean
}>

export type CachedItemProps<TStore extends StoreApi<unknown>, TSelected> = {
	selector: (state: ExtractState<TStore>) => TSelected
	children: (state: TSelected) => ReactElement
}

/** Handle returned by `defineStore` — a group of keep-alive stores keyed by `(path, cacheKey)`. */
export type CachedStoreGroup<TStore extends StoreApi<unknown>, TDefaultProps extends object> = {
	Provider: (props: CachedProviderProps<TDefaultProps>) => ReactElement
	useStore: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	useShallowStore: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	useContextStore: () => TStore
	Item: <TSelected>(props: CachedItemProps<TStore, TSelected>) => ReactElement
	/** Imperative get-if-alive at `(path, key)`. Returns the live store or `undefined`. Never creates. */
	fromCache: (target: CacheTarget) => TStore | undefined
	/** Reactive, passive cross-tree read at `(path, key)`. Does not keep the store alive. */
	useFromCache: <TSelected>(
		target: CacheTarget,
		selector: (state: ExtractState<TStore> | undefined) => TSelected,
	) => TSelected
	/** Remove this group's entry at `(path, key)` immediately. */
	remove: (target: CacheTarget) => void
}

export type StoreCacheController = {
	/** Flat coordinates of live entries, optionally filtered to a path subtree. */
	keys: (prefix?: string[]) => CacheCoordinate[]
	/** Remove all entries, or — with a `prefix` — every entry under that path subtree, across groups. */
	clear: (prefix?: string[]) => void
}

export type StoreCache = {
	Provider: (props: PropsWithChildren) => ReactElement
	/** Contributes inherited path segments to descendant store-group `Provider`s. */
	Scope: (props: ScopeProps) => ReactElement
	useCache: () => StoreCacheController
	defineStore: <TStore extends StoreApi<unknown>, TDefaultProps extends object = Record<string, never>>(
		name: string,
		factory: CachedStoreFactory<TStore, TDefaultProps>,
		options?: DefineStoreOptions,
	) => CachedStoreGroup<TStore, TDefaultProps>
}

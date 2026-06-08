import type { ContextStoreInit } from '../create-context-store'
import type { PropsWithChildren, ReactElement } from 'react'
import type { ExtractState, StoreApi } from 'zustand/vanilla'

export type StoreCacheOptions = {
	/** Default eviction delay in ms after an entry's observer count reaches zero. */
	gcTime?: number
}

export type CachedStoreOptions = {
	/** Group namespace; must be unique within a cache. Visible in `keys()` / `useCacheKeys()`. */
	name: string
	/** Store-group default `gcTime`, overriding the cache default. */
	gcTime?: number
}

/** Builds the store instance for a freshly created cache entry, seeded with `defaultValue`. */
export type CachedStoreFactory<TStore extends StoreApi<unknown>, TDefaultValue extends object> = (
	init: ContextStoreInit<TDefaultValue>,
) => TStore

/** Absolute address of a cache entry within a store group: a tree `path` plus the entry `id`. */
export type CacheAddress = {
	/** Resolved tree location of the entry. Defaults to `[]` (root) when omitted. */
	path?: string[]
	/** Identity of the entry within its store group at `path`. */
	id: string
}

/** Structural coordinate of one live entry, as surfaced by `keys()` / `useKeys()`. */
export type CacheRecord = {
	path: string[]
	name: string
	id: string
}

/** Nested view of live entries: path segments nest as objects; each leaf maps store `name` → `id[]`. */
export type CacheTree = {
	[segment: string]: CacheTree | string[]
}

export type ScopeProps = PropsWithChildren<{
	/** Path segments contributed to descendants. Nested `Scope`s concatenate, outermost first. */
	path: string[]
}>

type ProviderBaseProps = {
	/** Identity of the cache entry within this store group at the resolved path. Required. */
	id: string
	/** Path segments appended after the inherited `Scope` path: `[...scope, ...path]`. */
	path?: string[]
	/** Birth-config: eviction delay for this entry. Fixed by the first mount of the identity. */
	gcTime?: number
	/** Birth-config: pin the entry against automatic eviction (equivalent to `gcTime: Infinity`). */
	alwaysCache?: boolean
}

/**
 * `defaultValue` is required when `TDefaultValue` has required fields, optional when it doesn't.
 * The conditional ensures consumers cannot silently omit a seed that the factory relies on.
 */
export type CachedProviderProps<TDefaultValue extends object> = PropsWithChildren<
	ProviderBaseProps &
		(Record<string, never> extends TDefaultValue ? { defaultValue?: TDefaultValue } : { defaultValue: TDefaultValue })
>

export type CachedItemProps<TStore extends StoreApi<unknown>, TSelected> = {
	selector: (state: ExtractState<TStore>) => TSelected
	children: (state: TSelected) => ReactElement
}

/** Handle returned by `createCachedStore` — a group of keep-alive stores keyed by `(path, id)`. */
export type CachedStoreGroup<TStore extends StoreApi<unknown>, TDefaultValue extends object> = {
	Provider: (props: CachedProviderProps<TDefaultValue>) => ReactElement
	useStore: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	useShallowStore: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	useContextStore: () => TStore
	Item: <TSelected>(props: CachedItemProps<TStore, TSelected>) => ReactElement
	/** Imperative get-if-alive at `(path, id)`. Returns the live store or `undefined`. Never creates. */
	fromCache: (target: CacheAddress) => TStore | undefined
	/** Reactive, passive cross-tree read at `(path, id)`. Does not keep the store alive. */
	useFromCache: <TSelected>(
		target: CacheAddress,
		selector: (state: ExtractState<TStore> | undefined) => TSelected,
	) => TSelected
	/** Remove this group's entry at `(path, id)` immediately. */
	remove: (target: CacheAddress) => void
}

export type StoreCacheController = {
	/** Flat coordinates of live entries, optionally filtered to a path subtree. Non-reactive snapshot. */
	keys: (prefix?: string[]) => CacheRecord[]

	/** Remove all entries, or — with a `prefix` — every entry under that path subtree, across groups. */
	clear: (prefix?: string[]) => void
}

export type StoreCache = {
	Provider: (props: PropsWithChildren) => ReactElement
	/** Contributes inherited path segments to descendant store-group `Provider`s. */
	Scope: (props: ScopeProps) => ReactElement
	useCache: () => StoreCacheController
	/** Reactive: re-renders when entries are added or removed under the optional prefix. */
	useKeys: (prefix?: readonly string[]) => CacheRecord[]
	createCachedStore: <TStore extends StoreApi<unknown>, TDefaultValue extends object = Record<string, never>>(
		factory: CachedStoreFactory<TStore, TDefaultValue>,
		options: CachedStoreOptions,
	) => CachedStoreGroup<TStore, TDefaultValue>
}

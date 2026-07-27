import { createCacheReact } from '@ez-kit/store-core/cache'
import { type ReactElement } from 'react'
import { proxy, type Snapshot } from 'valtio'

import { RAW_SELECTOR, useRead } from './use-read'

import type {
	CachedStoreFactory,
	CachedStoreOptions,
	CacheReact,
	CachedProviderProps,
	CacheAddress,
} from '@ez-kit/store-core/cache'

/**
 * Stable placeholder `useFromCache` subscribes to when the target has no live entry. Valtio's
 * `useSnapshot` only accepts a registered proxy, so this must be a real proxy rather than a bare
 * object. Its state is never read — the selector receives `undefined` in that case.
 */
const FALLBACK_PROXY: object = proxy({})

/** Render-prop argument for a cached group `Item`: `snap` for reads, `store` (raw proxy) for writes. */
export type CachedItemRenderArg<TState extends object> = {
	snap: Snapshot<TState>
	store: TState
}

export type CachedItemProps<TState extends object> = {
	children: (arg: CachedItemRenderArg<TState>) => ReactElement
}

/**
 * A keep-alive group of Valtio proxies keyed by `(path, id)`. `useStore()` (and its explicit alias
 * `useSnapshot()`) returns the tracked readonly snapshot; `useContextStore()` returns the raw mutable
 * proxy to write to. Cache-hits return the SAME proxy object, so in-progress mutations survive
 * unmount/remount within `gcTime`.
 */
export type CachedStoreGroup<TState extends object, TDefaultValue extends object> = {
	Provider: (props: CachedProviderProps<TDefaultValue>) => ReactElement
	/** Returns the readonly, auto-tracked snapshot for this group's entry. Re-renders on read fields. */
	useStore: () => Snapshot<TState>
	/** Explicit alias of `useStore()` — the readonly, auto-tracked snapshot for this group's entry. */
	useSnapshot: () => Snapshot<TState>
	/** Returns the raw, mutable Valtio proxy for this group's entry. Mutate it directly; never subscribes. */
	useContextStore: () => TState
	/** Render-prop receiving `{ snap, store }`, mirroring `createContextStore`'s `Item`. */
	Item: (props: CachedItemProps<TState>) => ReactElement
	/** Imperative get-if-alive at `(path, id)`. Returns the live proxy or `undefined`. Never creates. */
	fromCache: (target: CacheAddress) => TState | undefined
	/**
	 * Reactive, passive cross-tree read at `(path, id)`. The selector receives the entry's snapshot,
	 * or `undefined` when no entry is live. Never creates an entry and never keeps one alive.
	 */
	useFromCache: <TSelected>(
		target: CacheAddress,
		selector: (snap: Snapshot<TState> | undefined) => TSelected,
	) => TSelected
	/** Remove this group's entry at `(path, id)` immediately. */
	remove: (target: CacheAddress) => void
}

export type StoreCache = {
	Provider: CacheReact<object>['Provider']
	Scope: CacheReact<object>['Scope']
	useCache: CacheReact<object>['useCache']
	useCacheKeys: CacheReact<object>['useCacheKeys']
	createCachedStore: <TState extends object, TDefaultValue extends object = Record<string, never>>(
		factory: CachedStoreFactory<TState, TDefaultValue>,
		options: CachedStoreOptions<TState>,
	) => CachedStoreGroup<TState, TDefaultValue>
}

/**
 * Valtio-bound cache surface, built on `@ez-kit/store-core/cache` via `createCacheReact` with
 * `useRead = (proxy, selector) => selector(useSnapshot(proxy))`. Returns the same
 * `{ Provider, Scope, useCache, useCacheKeys, createCachedStore }` shape as `@ez-kit/zu-store`.
 */
export function createStoreCache(options: Parameters<typeof createCacheReact>[1] = {}): StoreCache {
	const cache = createCacheReact<object>({ useRead, fallbackInstance: FALLBACK_PROXY }, options)

	function createCachedStore<TState extends object, TDefaultValue extends object = Record<string, never>>(
		factory: CachedStoreFactory<TState, TDefaultValue>,
		groupOptions: CachedStoreOptions<TState>,
	): CachedStoreGroup<TState, TDefaultValue> {
		const group = cache.createCachedStore<TDefaultValue>(factory, groupOptions)

		function useSnapshot(): Snapshot<TState> {
			return group.useStore((snap) => snap) as Snapshot<TState>
		}

		function useContextStore(): TState {
			return group.useStore(RAW_SELECTOR) as TState
		}

		function Item({ children }: CachedItemProps<TState>): ReactElement {
			return children({ snap: useSnapshot(), store: useContextStore() })
		}

		function fromCache(target: CacheAddress): TState | undefined {
			return group.fromCache(target) as TState | undefined
		}

		function useFromCache<TSelected>(
			target: CacheAddress,
			selector: (snap: Snapshot<TState> | undefined) => TSelected,
		): TSelected {
			return group.useFromCache(target, selector as (snap: unknown) => TSelected)
		}

		function remove(target: CacheAddress): void {
			group.remove(target)
		}

		return {
			Provider: group.Provider,
			useStore: useSnapshot,
			useSnapshot,
			useContextStore,
			Item,
			fromCache,
			useFromCache,
			remove,
		}
	}

	return {
		Provider: cache.Provider,
		Scope: cache.Scope,
		useCache: cache.useCache,
		useCacheKeys: cache.useCacheKeys,
		createCachedStore,
	}
}

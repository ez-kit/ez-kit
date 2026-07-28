import { createCacheReact } from '@ez-kit/store-core/cache'
import { type ReactElement } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { createStore } from 'zustand/vanilla'

import { useRead } from './use-read'

import type {
	CacheAddress,
	CachedProviderProps,
	CachedStoreFactory,
	CachedStoreOptions,
	CacheReact,
	StoreCacheOptions,
} from '@ez-kit/store-core/cache'
import type { ExtractState, StoreApi } from 'zustand/vanilla'

export const MISSING_CACHE_PROVIDER = 'Missing StoreCacheProvider'

const MULTIPLE_PROVIDERS_WARNING =
	'[zu-store] Multiple <cache.Provider> instances are mounted concurrently for the same createStoreCache. ' +
	'Imperative access via fromCache/remove targets the most recently activated cache and is ambiguous in this state.'

/** The instance type this cache stores: any Zustand vanilla store. */
type AnyStore = StoreApi<unknown>

/**
 * Stable placeholder `useFromCache` subscribes to when the target has no live entry. Zustand's
 * `useStore` calls `getState`, so this must be a real store rather than a bare object. Its state is
 * never read — the selector receives `undefined` in that case.
 */
const FALLBACK_STORE: AnyStore = createStore<unknown>(() => ({}))

export type CachedItemProps<TStore extends AnyStore, TSelected> = {
	selector: (state: ExtractState<TStore>) => TSelected
	children: (state: TSelected) => ReactElement
}

/** Handle returned by `createCachedStore` — a group of keep-alive stores keyed by `(path, id)`. */
export type CachedStoreGroup<TStore extends AnyStore, TDefaultValue extends object> = {
	Provider: (props: CachedProviderProps<TDefaultValue>) => ReactElement
	/** Selector-based read of this group's entry. Re-renders when the selected value changes. */
	useSelector: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	/** As `useSelector`, but compares the selected value shallowly — for object/array selections. */
	useShallowSelector: <TSelected>(selector: (state: ExtractState<TStore>) => TSelected) => TSelected
	/** The raw store handle for this group's entry. Does not subscribe, so it never re-renders. */
	useStore: () => TStore
	/** Render-prop receiving the selected state, mirroring `createContextStore`'s `Item`. */
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

export type StoreCache = {
	Provider: CacheReact<AnyStore>['Provider']
	/** Contributes inherited path segments to descendant store-group `Provider`s. */
	Scope: CacheReact<AnyStore>['Scope']
	useCache: CacheReact<AnyStore>['useCache']
	/** Reactive: re-renders when entries are added or removed under the optional prefix. */
	useCacheKeys: CacheReact<AnyStore>['useCacheKeys']
	createCachedStore: <TStore extends AnyStore, TDefaultValue extends object = Record<string, never>>(
		factory: CachedStoreFactory<TStore, TDefaultValue>,
		options: CachedStoreOptions<TStore>,
	) => CachedStoreGroup<TStore, TDefaultValue>
}

/**
 * Zustand-bound cache surface, built on `@ez-kit/store-core/cache` via `createCacheReact` with
 * `useRead = (store, selector) => useStore(store, selector)`. Returns the same
 * `{ Provider, Scope, useCache, useCacheKeys, createCachedStore }` shape as `@ez-kit/va-store`.
 */
export function createStoreCache(options: StoreCacheOptions = {}): StoreCache {
	const cache = createCacheReact<AnyStore>(
		{
			useRead,
			fallbackInstance: FALLBACK_STORE,
			messages: { missingProvider: MISSING_CACHE_PROVIDER, multipleProviders: MULTIPLE_PROVIDERS_WARNING },
		},
		options,
	)

	function createCachedStore<TStore extends AnyStore, TDefaultValue extends object = Record<string, never>>(
		factory: CachedStoreFactory<TStore, TDefaultValue>,
		groupOptions: CachedStoreOptions<TStore>,
	): CachedStoreGroup<TStore, TDefaultValue> {
		const group = cache.createCachedStore<TDefaultValue>(factory, groupOptions)

		function useSelector<TSelected>(selector: (state: ExtractState<TStore>) => TSelected): TSelected {
			return group.useSelector(selector as (snap: unknown) => TSelected)
		}

		function useShallowSelector<TSelected>(selector: (state: ExtractState<TStore>) => TSelected): TSelected {
			return group.useSelector(useShallow(selector) as (snap: unknown) => TSelected)
		}

		function useStore(): TStore {
			return group.useInstance() as TStore
		}

		function Item<TSelected>({ selector, children }: CachedItemProps<TStore, TSelected>): ReactElement {
			return children(useSelector(selector))
		}

		function fromCache(target: CacheAddress): TStore | undefined {
			return group.fromCache(target) as TStore | undefined
		}

		function useFromCache<TSelected>(
			target: CacheAddress,
			selector: (state: ExtractState<TStore> | undefined) => TSelected,
		): TSelected {
			// Shallow-compare the cross-tree read: `useShallow` memoises its own last result, so the
			// fresh wrapper the core builds around this selector still yields a stable reference.
			return group.useFromCache(target, useShallow(selector) as (snap: unknown) => TSelected)
		}

		function remove(target: CacheAddress): void {
			group.remove(target)
		}

		return {
			Provider: group.Provider,
			useSelector,
			useShallowSelector,
			useStore,
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

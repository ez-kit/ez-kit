import { createCacheReact } from '@ez-kit/store-core/cache'
import { type ReactElement } from 'react'
import { proxy, type Snapshot } from 'valtio'

import { PACKAGE_TAG } from '../package-tag'
import { useSelector as useProxySelector, type UseSelectorOptions } from '../use-selector'
import { ProxySubscribe, type SubscribeComponent, type SubscribeProps } from '../use-selector/subscribe'

import { useRead } from './use-read'

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

export const MISSING_CACHE_PROVIDER = `${PACKAGE_TAG} Missing <CacheProvider>`

const MULTIPLE_PROVIDERS_WARNING =
	`${PACKAGE_TAG} Multiple <cache.Provider> instances are mounted concurrently for the same createStoreCache. ` +
	'Imperative access via getFromCache/remove targets the most recently activated cache and is ambiguous in this state.'

export type CachedSubscribeProps<TState extends object, TSelected = Snapshot<TState>> = SubscribeProps<
	TState,
	TSelected
>

export type CachedStoreProps<TState extends object> = {
	children: (store: TState) => ReactElement
}

/**
 * A keep-alive group of Valtio proxies keyed by `(path, id)`. `useSnapshot()` returns the tracked
 * readonly snapshot; `useStore()` returns the raw mutable proxy to write to. Cache-hits return
 * the SAME proxy object, so in-progress mutations survive unmount/remount within `gcTime`.
 */
export type CachedStoreGroup<TState extends object, TDefaultValue extends object> = {
	Provider: (props: CachedProviderProps<TDefaultValue>) => ReactElement
	/** Returns the readonly, auto-tracked snapshot for this group's entry. Re-renders on read fields. */
	useSnapshot: () => Snapshot<TState>
	/** Returns the raw, mutable Valtio proxy for this group's entry. Mutate it directly; never re-renders. */
	useStore: () => TState
	/** Selects from this entry snapshot with result equality (Object.is by default). */
	useSelector: <TSelected>(
		selector: (snap: Snapshot<TState>) => TSelected,
		options?: UseSelectorOptions<TSelected>,
	) => TSelected
	/** Render-prop receiving `(snapshotOrSelection, store)`, mirroring the context store. */
	Subscribe: SubscribeComponent<TState>
	/**
	 * Write-only render-prop receiving the raw proxy, mirroring `createContextStore`'s `Store`.
	 * Does not subscribe, so store mutations never re-render its children.
	 */
	Store: (props: CachedStoreProps<TState>) => ReactElement
	/** Imperative get-if-alive at `(path, id)`. Returns the live proxy or `undefined`. Never creates. */
	getFromCache: (target: CacheAddress) => TState | undefined
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
		options: CachedStoreOptions,
	) => CachedStoreGroup<TState, TDefaultValue>
}

/**
 * Valtio-bound cache surface, built on `@ez-kit/store-core/cache` via `createCacheReact` with
 * `useRead = (proxy, selector) => selector(useSnapshot(proxy))`. Returns the same
 * `{ Provider, Scope, useCache, useCacheKeys, createCachedStore }` shape as `@ez-kit/zu-store`.
 */
export function createStoreCache(options: Parameters<typeof createCacheReact>[1] = {}): StoreCache {
	const cache = createCacheReact<object>(
		{
			useRead,
			fallbackInstance: FALLBACK_PROXY,
			messages: { missingProvider: MISSING_CACHE_PROVIDER, multipleProviders: MULTIPLE_PROVIDERS_WARNING },
		},
		options,
	)

	function createCachedStore<TState extends object, TDefaultValue extends object = Record<string, never>>(
		factory: CachedStoreFactory<TState, TDefaultValue>,
		groupOptions: CachedStoreOptions,
	): CachedStoreGroup<TState, TDefaultValue> {
		const group = cache.createCachedStore<TDefaultValue>(factory, groupOptions)

		function useSnapshot(): Snapshot<TState> {
			return group.useSelector((snap) => snap) as Snapshot<TState>
		}

		function useStore(): TState {
			return group.useInstance() as TState
		}

		function useSelector<TSelected>(
			selector: (snap: Snapshot<TState>) => TSelected,
			selectorOptions?: UseSelectorOptions<TSelected>,
		): TSelected {
			return useProxySelector(useStore(), selector, selectorOptions)
		}

		function Subscribe<TSelected>(props: CachedSubscribeProps<TState, TSelected>): ReactElement {
			return (
				<ProxySubscribe
					{...props}
					store={useStore()}
				/>
			)
		}

		function Store({ children }: CachedStoreProps<TState>): ReactElement {
			return children(useStore())
		}

		function getFromCache(target: CacheAddress): TState | undefined {
			return group.getFromCache(target) as TState | undefined
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
			useSnapshot,
			useStore,
			useSelector,
			Subscribe,
			Store,
			getFromCache,
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

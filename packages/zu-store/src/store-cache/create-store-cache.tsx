import { createContext, useContext, useEffect, useMemo, useRef, type PropsWithChildren, type ReactElement } from 'react'
import { useStore as useZustandStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { createCacheInstance, DEFAULT_GC_TIME } from './cache-instance'
import { createDefineStore, type ActiveCacheRef } from './define-store'

import type { CacheInstance, PublishedStoresState } from './cache-types'
import type { CacheRecord, ScopeProps, StoreCache, StoreCacheController, StoreCacheOptions } from './types'

export const MISSING_CACHE_PROVIDER = 'Missing StoreCacheProvider for createStoreCache'

const EMPTY_SCOPE: readonly string[] = []
const IS_DEV = process.env.NODE_ENV !== 'production'

export function createStoreCache(options: StoreCacheOptions = {}): StoreCache {
	const cacheGcTime = options.gcTime ?? DEFAULT_GC_TIME
	const CacheContext = createContext<CacheInstance | null>(null)
	const ScopeContext = createContext<readonly string[]>(EMPTY_SCOPE)
	const activeCache: ActiveCacheRef = { current: null }
	const registeredGroupNames = new Set<string>()

	function registerGroupName(name: string): void {
		if (!IS_DEV) return
		if (registeredGroupNames.has(name)) {
			console.warn(
				`[zu-store] defineStore('${name}') was called more than once on the same cache. ` +
					'If you intended a single group, call defineStore at module top-level (not inside render). ' +
					'If you intended distinct groups, give each a unique name.',
			)
		}
		registeredGroupNames.add(name)
	}

	function Provider({ children }: PropsWithChildren): ReactElement {
		const cacheRef = useRef<CacheInstance | null>(null)
		cacheRef.current ??= createCacheInstance(cacheGcTime)
		const cache = cacheRef.current

		useEffect(() => {
			// Imperative access (fromCache/remove) is client-only; the cache never becomes "active" on the server.
			if (typeof window === 'undefined') return
			if (IS_DEV && activeCache.current !== null && activeCache.current !== cache) {
				console.warn(
					'[zu-store] Multiple <cache.Provider> instances are mounted concurrently for the same createStoreCache. ' +
						'Imperative access via fromCache/remove targets the most recently activated cache and is ambiguous in this state.',
				)
			}
			activeCache.current = cache
			return () => {
				if (activeCache.current === cache) activeCache.current = null
			}
		}, [cache])

		return <CacheContext.Provider value={cache}>{children}</CacheContext.Provider>
	}

	function Scope({ path, children }: ScopeProps): ReactElement {
		const inherited = useContext(ScopeContext)
		// Serialized path keeps the memo stable across inline-array prop churn and constant deps-array size.
		const pathKey = JSON.stringify(path)
		const value = useMemo(
			() => [...inherited, ...path],
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[inherited, pathKey],
		)
		return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
	}

	function useKeys(prefix?: readonly string[]): CacheRecord[] {
		const cache = useContext(CacheContext)
		if (!cache) throw new Error(MISSING_CACHE_PROVIDER)
		// Subscribe to the membership signature — a stable, shallow-comparable string list.
		// Internal state changes inside individual entries do NOT update publishedStores, so they cannot trigger here.
		const signature = useZustandStore(
			cache.publishedStores,
			useShallow((state: PublishedStoresState): readonly string[] => [...state.published.keys()]),
		)
		const prefixKey = prefix ? JSON.stringify(prefix) : ''
		const computeKeys = (): CacheRecord[] => cache.keys(prefix)
		return useMemo<CacheRecord[]>(
			computeKeys,
			// `signature` change ⇒ membership change; `prefixKey` change ⇒ filter change.
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[cache, signature, prefixKey],
		)
	}

	function useCache(): StoreCacheController {
		const cache = useContext(CacheContext)
		if (!cache) throw new Error(MISSING_CACHE_PROVIDER)
		return { keys: cache.keys, clear: cache.clear }
	}

	const defineStore = createDefineStore({
		CacheContext,
		ScopeContext,
		activeCache,
		cacheGcTime,
		missingProviderError: MISSING_CACHE_PROVIDER,
		registerGroupName,
	})

	return { Provider, Scope, useCache, defineStore, useKeys }
}

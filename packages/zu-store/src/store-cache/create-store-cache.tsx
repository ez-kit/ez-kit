import { createContext, useContext, useEffect, useRef, type PropsWithChildren, type ReactElement } from 'react'

import { createCacheInstance, DEFAULT_GC_TIME, type CacheInstance } from './cache'
import { createDefineStore, type ActiveCacheRef } from './define-store'

import type { StoreCache, StoreCacheController, StoreCacheOptions } from './types'

export const MISSING_CACHE_PROVIDER = 'Missing StoreCacheProvider for createStoreCache'

export function createStoreCache(options: StoreCacheOptions = {}): StoreCache {
	const cacheGcTime = options.gcTime ?? DEFAULT_GC_TIME
	const CacheContext = createContext<CacheInstance | null>(null)
	const activeCache: ActiveCacheRef = { current: null }

	function Provider({ children }: PropsWithChildren): ReactElement {
		const cacheRef = useRef<CacheInstance | null>(null)
		cacheRef.current ??= createCacheInstance(cacheGcTime)
		const cache = cacheRef.current

		useEffect(() => {
			// Imperative access (fromCache/remove) is client-only; the cache never becomes "active" on the server.
			if (typeof window === 'undefined') return
			activeCache.current = cache
			return () => {
				if (activeCache.current === cache) activeCache.current = null
			}
		}, [cache])

		return <CacheContext.Provider value={cache}>{children}</CacheContext.Provider>
	}

	function useCache(): StoreCacheController {
		const cache = useContext(CacheContext)
		if (!cache) throw new Error(MISSING_CACHE_PROVIDER)
		return { keys: cache.keys, clear: cache.clear }
	}

	const defineStore = createDefineStore({
		CacheContext,
		activeCache,
		cacheGcTime,
		missingProviderError: MISSING_CACHE_PROVIDER,
	})

	return { Provider, useCache, defineStore }
}

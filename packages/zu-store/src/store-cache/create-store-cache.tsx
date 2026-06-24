import { createInstanceCache, DEFAULT_GC_TIME } from '@ez-kit/store-core/cache'
import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	type PropsWithChildren,
	type ReactElement,
} from 'react'


import { wrapCachedStoreGroup } from './create-cached-store'
import { createUseKeys } from './use-keys'

import type { ScopeProps, StoreCache, StoreCacheController, StoreCacheOptions } from './types'
import type { InstanceCache } from '@ez-kit/store-core/cache'

export const MISSING_CACHE_PROVIDER = 'Missing StoreCacheProvider'

const EMPTY_SCOPE: readonly string[] = []
const IS_DEV = process.env.NODE_ENV !== 'production'

const MULTIPLE_PROVIDERS_WARNING =
	'[zu-store] Multiple <cache.Provider> instances are mounted concurrently for the same createStoreCache. ' +
	'Imperative access via fromCache/remove targets the most recently activated cache and is ambiguous in this state.'

/** Mutable handle to the cache owned by the currently-mounted `cache.Provider` (client-only). */
type ActiveCacheRef = { current: InstanceCache | null }

export function createStoreCache(options: StoreCacheOptions = {}): StoreCache {
	const cacheGcTime = options.gcTime ?? DEFAULT_GC_TIME

	const CacheContext = createContext<InstanceCache | null>(null)
	const ScopeContext = createContext<readonly string[]>(EMPTY_SCOPE)

	const activeCache: ActiveCacheRef = { current: null }
	const registeredGroupNames = new Set<string>()

	function registerGroupName(name: string): void {
		if (!IS_DEV) return
		if (registeredGroupNames.has(name)) {
			console.warn(
				`[zu-store] createCachedStore({ name: '${name}' }) was called more than once on the same cache. ` +
					'If you intended a single group, call createCachedStore at module top-level (not inside render). ' +
					'If you intended distinct groups, give each a unique name.',
			)
		}
		registeredGroupNames.add(name)
	}

	function Provider({ children }: PropsWithChildren): ReactElement {
		const cacheRef = useRef<InstanceCache | null>(null)
		cacheRef.current ??= createInstanceCache(cacheGcTime !== DEFAULT_GC_TIME ? { defaultGcTime: cacheGcTime } : {})
		const cache = cacheRef.current

		useEffect(() => {
			// Imperative access (fromCache/remove) is client-only; the cache never becomes "active" on the server.
			if (typeof window === 'undefined') return
			if (IS_DEV && activeCache.current !== null && activeCache.current !== cache) {
				console.warn(MULTIPLE_PROVIDERS_WARNING)
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
		const pathKey = JSON.stringify(path)
		const value = useMemo(
			() => [...inherited, ...path],
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[inherited, pathKey],
		)
		return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
	}

	const useKeys = createUseKeys({ CacheContext, missingProviderError: MISSING_CACHE_PROVIDER })

	function useCache(): StoreCacheController {
		const cache = useContext(CacheContext)
		if (!cache) throw new Error(MISSING_CACHE_PROVIDER)
		return { keys: cache.keys, clear: cache.clear }
	}

	const createCachedStore = wrapCachedStoreGroup({
		CacheContext,
		ScopeContext,
		activeCache,
		cacheGcTime,
		missingProviderError: MISSING_CACHE_PROVIDER,
		registerGroupName,
	})

	return { Provider, Scope, useCache, useKeys, createCachedStore }
}

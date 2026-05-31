import { useContext, useMemo, type Context } from 'react'
import { useStore as useZustandStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import type { CacheInstance, CachedStoresState } from './cache-types'
import type { CacheRecord } from './types'

type UseKeysDeps = {
	CacheContext: Context<CacheInstance | null>
	missingProviderError: string
}

/**
 * Builds the reactive `useKeys` hook for a cache. Kept out of the core `createStoreCache` wiring —
 * it is an inspection convenience, not part of the cache's main lifecycle logic.
 */
export function createUseKeys({ CacheContext, missingProviderError }: UseKeysDeps) {
	return function useKeys(prefix?: readonly string[]): CacheRecord[] {
		const cache = useContext(CacheContext)
		if (!cache) throw new Error(missingProviderError)
		// Subscribe to the membership signature — a stable, shallow-comparable string list.
		// Internal state changes inside individual entries do NOT update cachedStores, so they cannot trigger here.
		const signature = useZustandStore(
			cache.cachedStores,
			useShallow((state: CachedStoresState): readonly string[] => [...state.stores.keys()]),
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
}

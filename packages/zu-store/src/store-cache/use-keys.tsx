import { useContext, useMemo, useSyncExternalStore, type Context } from 'react'

import type { CacheRecord } from './types'
import type { InstanceCache } from '@ez-kit/store-core/cache'

type UseKeysDeps = {
	CacheContext: Context<InstanceCache | null>
	missingProviderError: string
}

/**
 * Builds the reactive `useKeys` hook for a cache. Uses `useSyncExternalStore` against the
 * InstanceCache's membership pub/sub so the subscription is established synchronously at render —
 * this avoids the subscribe-in-effect race where an entry created by an earlier-mounted sibling
 * notifies before a later sibling's effect has subscribed.
 */
export function createUseKeys({ CacheContext, missingProviderError }: UseKeysDeps) {
	return function useKeys(prefix?: readonly string[]): CacheRecord[] {
		const cache = useContext(CacheContext)
		if (!cache) throw new Error(missingProviderError)

		// Stable membership snapshot: same reference until membership changes, satisfying the
		// `useSyncExternalStore` caching invariant. Its identity change drives `useMemo` below.
		const snapshot = useSyncExternalStore(cache.subscribe, cache.getKeysSnapshot, cache.getKeysSnapshot)

		const prefixKey = prefix ? JSON.stringify(prefix) : ''
		return useMemo<CacheRecord[]>(
			() => cache.keys(prefix),
			// `snapshot` change ⇒ membership change; `prefixKey` change ⇒ filter change.
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[cache, snapshot, prefixKey],
		)
	}
}

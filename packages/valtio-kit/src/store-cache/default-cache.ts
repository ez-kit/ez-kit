import { createStoreCache } from './create-store-cache'

/**
 * Batteries-included default cache. One module-level instance so the common case needs no
 * `createStoreCache` call — just import `CacheProvider` + `createCachedStore` and go.
 *
 * SSR-safe by construction: entry storage lives in `CacheProvider` (per React tree), not in this
 * module-level instance, which holds only React contexts plus a client-only active-cache ref. Reach
 * for `createStoreCache` directly when you need an isolated cache or custom configuration.
 *
 * Members are closures over the instance (no `this`), so destructuring is safe.
 */
const defaultCache = createStoreCache()

export const {
	Provider: CacheProvider,
	Scope: CacheScope,
	useCache,
	useCacheKeys,
	createCachedStore,
} = defaultCache

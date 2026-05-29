---
'@ez-kit/zu-store': minor
---

Add `createStoreCache` — an in-memory, keyed store cache that keeps `createContextStore`-style stores alive across `Provider` unmount/remount. Returns `{ Provider, useCache, defineStore }`; each `defineStore(factory)` family exposes a keyed `Provider` (`cacheKey` + `defaultProps`, optional `gcTime`/`alwaysCache`), the usual read hooks, plus imperative `fromCache`, reactive passive `useFromCache`, and `remove`. Reference-counted GC with lazy sweep, client-only/SSR-safe, and `createContextStore` is left unchanged.

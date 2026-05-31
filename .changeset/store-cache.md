---
'@ez-kit/zu-store': minor
---

Add `createStoreCache` — an in-memory store cache that keeps `createContextStore`-style stores alive across `Provider` unmount/remount. Entries are keyed by `(path, group, cacheKey)`: the `path` is inherited from `<cache.Scope path={[...]}>` (nested scopes concatenate; a `path` prop on the `Provider` extends it), so reusable components stay collision-free across mount locations.

Returns `{ Provider, Scope, useCache, defineStore }`. Each `defineStore(factory)` group exposes a keyed `Provider` (`cacheKey` + optional `path`/`defaultProps`/`gcTime`/`alwaysCache`), the usual read hooks, plus imperative `fromCache({ path?, key })`, reactive passive `useFromCache({ path?, key }, selector)`, and `remove({ path?, key })` — reads address the absolute path. `useCache()` exposes `keys(prefix?)` (flat `{ path, group, key }[]`) and `clear(prefix?)` (cross-group subtree eviction); a standalone `toTree(coords)` pure utility renders any coordinate list as a nested object view. Reference-counted GC with lazy sweep, client-only/SSR-safe, and `createContextStore` is left unchanged.

import { createStoreCache } from './create-store-cache'

/**
 * Batteries-included default cache. One module-level instance so the common case needs no
 * `createStoreCache` call — just import `CacheProvider` + `createCachedStore` and go.
 *
 * SSR-safe by the same construction as a hand-made cache: entry storage lives in
 * `CacheProvider` (per React tree), not in this module-level instance, which holds only React
 * contexts plus a client-only `activeCache` ref. Reach for `createStoreCache` directly when you
 * need an isolated cache or custom configuration.
 *
 * Members are closures over the instance (no `this`), so reading them off it is safe.
 */
const defaultCache = /* @__PURE__ */ createStoreCache()

/**
 * Each member is read inside a `@__PURE__`-annotated IIFE rather than destructured off
 * `defaultCache`. A bundler treats a top-level property read as a possible side effect (the
 * property could be a getter), so the plain form — `export const { Provider: CacheProvider, ... } =
 * defaultCache` — keeps all five reads, which keep `defaultCache`, which keeps `createStoreCache`
 * and the whole `store-core/cache` graph, anchored into every bundle that imports anything from
 * this package's root, `createContextStore` included. Deferring the read into a function body
 * lets an unused member drop with the cache behind it.
 */
export const CacheProvider = /* @__PURE__ */ (() => defaultCache.Provider)()
export const CacheScope = /* @__PURE__ */ (() => defaultCache.Scope)()
export const useCache = /* @__PURE__ */ (() => defaultCache.useCache)()
export const useCacheKeys = /* @__PURE__ */ (() => defaultCache.useCacheKeys)()
export const createCachedStore = /* @__PURE__ */ (() => defaultCache.createCachedStore)()

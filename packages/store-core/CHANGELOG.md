# @ez-kit/store-core

## 0.2.1

### Patch Changes

- 96231cd: Fix cache entries that could escape eviction permanently.

  An unobserved entry's deadline was tracked on two different clocks: the eviction timer ran on
  `setTimeout` (the runtime's monotonic timer clock) while `idleSince` was stamped from `Date.now()`
  (the wall clock). The two drift, so the timer could fire while the wall clock still reported
  marginally less than `gcTime` elapsed. The `isExpired` re-check then returned `false`, the entry
  was not dropped — and because the sweep rescheduled nothing, no timer was left. The entry stayed
  alive until the next `addObserver`/`removeObserver`/`clear`, i.e. effectively forever, and
  `useFromCache` subscribers kept rendering the value of a supposedly evicted entry.

  The timer is now the sole authority on the deadline: it is installed only when the last observer
  leaves and cleared the moment one returns, so firing means the entry is due. The callback is
  per-entry, so a fired deadline no longer sweeps siblings whose own `gcTime` is not up yet. The
  wall-clock screen is also gone from `getInstance` — its answer could flip with no membership
  change, while `useFromCache` recomputes the live instance only on a membership signature change.

  No public API change.

## 0.2.0

### Minor Changes

- 2d36563: Add `@ez-kit/store-core` (shared cache + plugin core), give `@ez-kit/va-store` a store cache, and turn persist into a plugin.

  **New package `@ez-kit/store-core`** — a published, manager-agnostic core consumed by both store packages, with subpath exports:
  - `.` — the plugin/service contracts: `StoreId`, `StorePlugin`/`PluginContext`/`PluginCleanup`, `ServiceRegistry` (`get`/`safeGet`), `serviceKey`, and a React `ServicesProvider`/`useServices`.
  - `./cache` — a generic instance cache: `createInstanceCache` (`getOrCreate`/observers/`clear`) with a **create → reuse → clear** lifecycle that runs a per-instance `PluginCleanup` on clear, and `createCacheReact({ useRead })` (Provider/Scope/useCache/useCacheKeys/createCachedStore) parameterized by a single store-manager read primitive.
  - `./persist` — reserved for a future generic engine.

  **`@ez-kit/va-store`**
  - New cache surface mirroring `@ez-kit/zu-store`: `createStoreCache`, `Scope`, `useCache`, `useCacheKeys`, `createCachedStore`, plus a default-cache surface. A cache-hit returns the **same live proxy**, so in-progress mutations survive unmount/remount within `gcTime`.
  - New plugin-capable base factory `createStore(factory, { plugins? })`; `createContextStore` is unchanged and now layered on top.
  - New app-level `StoreProvider({ persist?, cache? })` that mounts one persist engine per source and publishes them (plus the cache) as services for plugins to resolve.
  - **BREAKING:** persist is now a plugin. `createPersistStore` and `createPersistFields` are removed. Migrate `createPersistStore(factory)` → `createCachedStore(factory, { plugins: [persist()] })` (cached) or `createStore(factory, { plugins: [persist()] })` (non-cached); `createPersistFields(factory, fields)` → the same factory plus `persist({ fields })`. `@persistUrl`/`@persistLocalStorage`/accessor field declarations are unchanged and discovered by `persist()`. `PersistProvider` still mounts engines (now exposed via the `PERSIST_ENGINES` service); the hardened persist engine internals are unchanged.

  **`@ez-kit/zu-store`**
  - The store cache is re-platformed onto `@ez-kit/store-core/cache`; public API is unchanged.
  - `createCachedStore` now accepts an optional `plugins` array, bound to the cached instance's lifetime (setup on create, cleanup on eviction).

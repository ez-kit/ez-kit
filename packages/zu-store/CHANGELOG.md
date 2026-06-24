# @ez-kit/zu-store

## 0.5.0

### Minor Changes

- 492e42a: **BREAKING:** `createContextStore` is now seeded through a single `defaultValue` envelope instead of spread init props.
  - The factory receives `{ defaultValue }` (type it with the new exported `ContextStoreInit<T>` helper) instead of a flat init object.
  - The `Provider` takes one `defaultValue` prop (required when the seed has required fields, optional otherwise) instead of loose props.

    ```diff
    - const counter = createContextStore((initProps: CounterInit) => …)
    + const counter = createContextStore(({ defaultValue }: ContextStoreInit<CounterInit>) => …)

    - <counter.Provider count={3} label="x">
    + <counter.Provider defaultValue={{ count: 3, label: 'x' }}>
    ```

  **`@ez-kit/valtio-kit` only — BREAKING:** the `Item` render-prop child now receives `{ snap, store }` (read via `snap`, write via the raw `store` proxy) instead of just `snap`.

  ```diff
  - <counter.Item>{(snap) => <span>{snap.count}</span>}</counter.Item>
  + <counter.Item>{({ snap, store }) => <span>{snap.count}</span>}</counter.Item>
  ```

  **`@ez-kit/zu-store` `createCachedStore` (store-cache) — BREAKING:** the Provider's `defaultProps` prop and `TDefaultProps` generic are renamed to `defaultValue` / `TDefaultValue`, and the factory now receives the same `{ defaultValue }` envelope, matching `createContextStore`.

  ```diff
  - createCachedStore((defaultProps: { filter?: string }) => …, { name: 'users' })
  + createCachedStore(({ defaultValue }: ContextStoreInit<{ filter?: string }>) => …, { name: 'users' })

  - <usersTable.Provider id="users" defaultProps={{ filter: 'active' }} />
  + <usersTable.Provider id="users" defaultValue={{ filter: 'active' }} />
  ```

- 2d36563: Add `@ez-kit/store-core` (shared cache + plugin core), give `@ez-kit/valtio-kit` a store cache, and turn persist into a plugin.

  **New package `@ez-kit/store-core`** — a published, manager-agnostic core consumed by both store packages, with subpath exports:
  - `.` — the plugin/service contracts: `StoreId`, `StorePlugin`/`PluginContext`/`PluginCleanup`, `ServiceRegistry` (`get`/`safeGet`), `serviceKey`, and a React `ServicesProvider`/`useServices`.
  - `./cache` — a generic instance cache: `createInstanceCache` (`getOrCreate`/observers/`clear`) with a **create → reuse → clear** lifecycle that runs a per-instance `PluginCleanup` on clear, and `createCacheReact({ useRead })` (Provider/Scope/useCache/useCacheKeys/createCachedStore) parameterized by a single store-manager read primitive.
  - `./persist` — reserved for a future generic engine.

  **`@ez-kit/valtio-kit`**
  - New cache surface mirroring `@ez-kit/zu-store`: `createStoreCache`, `Scope`, `useCache`, `useCacheKeys`, `createCachedStore`, plus a default-cache surface. A cache-hit returns the **same live proxy**, so in-progress mutations survive unmount/remount within `gcTime`.
  - New plugin-capable base factory `createStore(factory, { plugins? })`; `createContextStore` is unchanged and now layered on top.
  - New app-level `StoreProvider({ persist?, cache? })` that mounts one persist engine per source and publishes them (plus the cache) as services for plugins to resolve.
  - **BREAKING:** persist is now a plugin. `createPersistStore` and `createPersistFields` are removed. Migrate `createPersistStore(factory)` → `createCachedStore(factory, { plugins: [persist()] })` (cached) or `createStore(factory, { plugins: [persist()] })` (non-cached); `createPersistFields(factory, fields)` → the same factory plus `persist({ fields })`. `@persistUrl`/`@persistLocalStorage`/accessor field declarations are unchanged and discovered by `persist()`. `PersistProvider` still mounts engines (now exposed via the `PERSIST_ENGINES` service); the hardened persist engine internals are unchanged.

  **`@ez-kit/zu-store`**
  - The store cache is re-platformed onto `@ez-kit/store-core/cache`; public API is unchanged.
  - `createCachedStore` now accepts an optional `plugins` array, bound to the cached instance's lifetime (setup on create, cleanup on eviction).

### Patch Changes

- Updated dependencies [2d36563]
  - @ez-kit/store-core@0.2.0

## 0.4.0

### Minor Changes

- 6bd6980: Add `createStoreCache` — an in-memory store cache that keeps `createContextStore`-style stores alive across `Provider` unmount/remount. Entries are keyed by `(path, name, id)`: the `path` is inherited from `<cache.Scope path={[...]}>` (nested scopes concatenate; a `path` prop on the `Provider` extends it), so reusable components stay collision-free across mount locations.

  Returns `{ Provider, Scope, useCache, defineStore }`. Each `defineStore(factory)` group exposes a keyed `Provider` (`id` + optional `path` / `defaultProps` / `gcTime` / `alwaysCache`), the usual read hooks (`useStore` / `useShallowStore` / `useContextStore` / `Item`), plus imperative `fromCache({ path?, id })`, reactive passive `useFromCache({ path?, id }, selector)`, and `remove({ path?, id })` — reads address the absolute path. The `Provider`'s `defaultProps` is required at the type level when `TDefaultProps` has required fields.

  `useCache()` exposes `keys(prefix?)` (flat `CacheRecord[]` snapshot) plus reactive `useKeys(prefix?)` and `useTree(prefix?)` hooks that re-render only on membership changes (not on internal entry-state changes), and `clear(prefix?)` for cross-group subtree eviction with a single atomic publish notification regardless of subtree size. A standalone pure `toTree(records)` utility renders any coordinate list as a nested object view.

  Reference-counted GC with lazy sweep, client-only/SSR-safe, dev-mode warnings on duplicate `defineStore` names and concurrent `cache.Provider` mounts, fully typed (no `unknown` casts in public hooks). `createContextStore` is left unchanged.

- Add createStoreCache utility

## 0.3.0

### Minor Changes

- Move zustand to peerDependencies and document installing it alongside @ez-kit/zu-store.

## 0.2.1

### Patch Changes

- add git to package.json

## 0.2.0

### Minor Changes

- New useStoreState hook, withHistory middleware

## 0.1.1

### Patch Changes

- Add MIT license metadata to all package manifests.

## 0.1.0

### Minor Changes

- 48c129e: Create createContextStore util for zustand

# @ez-kit/zu-store

## 0.6.0

### Minor Changes

- c73fef9: Re-export `shallowEqual` and the `ControlledConfig` / `ControlledFieldConfig` types from both store packages.

  They are declared in `@ez-kit/store-core`, which is an ordinary dependency of these packages rather than a peer, so
  under pnpm's strict `node_modules` layout a consumer who installed only `@ez-kit/zu-store` (or `@ez-kit/va-store`)
  could not import them. That blocked the recommended fix for a controlled field whose value gets a fresh reference every
  render — `controlled: { users: { equals: shallowEqual } }` — and left the public `controlled` option with a type the
  consumer could not name. Both are now importable straight from the store package:

  ```ts
  import { createContextStore, shallowEqual } from '@ez-kit/zu-store'
  import type { ControlledConfig } from '@ez-kit/zu-store'
  ```

  Additive — `@ez-kit/store-core` keeps exporting them under the same names.

- c73fef9: Add controlled `value` support alongside `defaultValue`. `Provider` now accepts an optional `value` (a `Partial<TState>` slice owned by the parent) and `onValueChange` (the callback fed by the store's own writes), so a store field can be mirrored to and from external state instead of only being seeded once. Both are additive — no breaking changes.

  `defaultValue` still seeds the store once on creation; `value` then wins for the keys it lists, applied synchronously so the first frame is already correct (no seed flash, and SSR-safe since it does not rely on an effect). Later prop changes sync into the store via `useLayoutEffect`, compared key by key — `Object.is` by default, or a custom `equals` when declared — never by the `value` object's own reference. Only the keys that actually changed are written, through a custom `set` when declared or a direct write otherwise. A field written locally without a matching `onValueChange` intentionally drifts from `value` until the next prop change — mirror mode, not `<input value>`-style enforcement. `onValueChange` emits only the keys present in the current `value`, and never re-emits a change the Provider itself just applied from a prop sync (anti-echo).

  New in `@ez-kit/store-core`: `ControlledConfig`/`ControlledFieldConfig` (the per-key `equals`/`set` override type), `shallowEqual` (a ready-made `equals` for values that get a fresh reference every render, e.g. `value={{ users: transform(dto) }}`), `getChangedControlledEntries`, and `pickControlledKeys`.

  `createContextStore` (`@ez-kit/zu-store`) and `createStore`/`createContextStore` (`@ez-kit/va-store`) both take a new `controlled` option — a map of per-key `{ equals?, set? }` overrides — with identical prop and option names across the two packages.

### Patch Changes

- 8c384e1: Packaging hygiene across the three store packages.
  - Ship a `LICENSE` file with each package. Only the data-grid packages carried one; these three published without it.
  - Replace the placeholder `description` ("A reusable utility package for ez-kit.") on `@ez-kit/zu-store` and `@ez-kit/store-core` — it was what the npm page showed.
  - Add a README to `@ez-kit/store-core`, which published with an empty page.
  - Tighten the `size-limit` budgets, which were set so loosely they could not fail. The root entries allowed 50 kB against real sizes of 3.4 kB (zu-store) and 4.6 kB (va-store); every entry is now budgeted at roughly its actual size plus 40%, so a doubling gets caught while ordinary edits do not trip CI.

  **Breaking (`@ez-kit/store-core`):** the `@ez-kit/store-core/persist` subpath is removed. It exported a single reserved type (`InstanceAdapter`) with no runtime behind it, was referenced nowhere, and only served to publish an empty contract. It will come back when the persist core actually moves into store-core.

- 127139c: Mark the React entrypoints as client modules so the packages can be imported from a Next.js App Router server component.

  Every entry that touches React now ships a `'use client'` directive: `@ez-kit/zu-store`, `@ez-kit/va-store`, `@ez-kit/va-store/persist`, `@ez-kit/va-store/persist/url/react-router` and `@ez-kit/store-core/cache`. Without it, importing any of them from a server component failed with `createContext is not a function`.

  Entries that contain no React are deliberately left unmarked, so they stay usable on the server: `@ez-kit/store-core`, `@ez-kit/va-store/persist/internals`, `@ez-kit/va-store/persist/storage`, `@ez-kit/va-store/persist/url` and `@ez-kit/va-store/persist/validators/zod`.

  **Breaking (`@ez-kit/store-core`):** `ServicesProvider` and `useServices` moved from the package root to the new `@ez-kit/store-core/react` subpath. The root entry mixed a React provider with pure helpers (`serializeStoreId`, `serviceKey`, `createServiceRegistry`), so marking it as a client module would have made those helpers unusable in server code. Update imports:

  ```diff
  -import { createServiceRegistry, ServicesProvider } from '@ez-kit/store-core'
  +import { createServiceRegistry } from '@ez-kit/store-core'
  +import { ServicesProvider } from '@ez-kit/store-core/react'
  ```

  Consumers of `@ez-kit/va-store` are unaffected — `StoreProvider` and the persist plugin resolve the services registry internally.

- e93fa7d: `useStoreState`: memoise the setter. It was rebuilt on every render, so it invalidated any effect that listed it as a dependency and re-rendered memoised children it was passed to. It is now wrapped in `useCallback([store, key])`, and the update patches the single key directly (Zustand merges shallowly) instead of spreading the previous state.

  `createStore`: name the store in the missing-Provider error. A store created as `createStore(factory, { name: 'filters' })` reported `Missing Provider for createContextStore`, which points at the wrong factory and gives no hint which store is unprovided. The message now uses the store's own name — `Missing Provider for filters`. Stores created through `createContextStore` are unaffected (the message stays `Missing Provider for createContextStore`); a `createStore` call with no `name` now reports the default, `Missing Provider for store`.

- Updated dependencies [c73fef9]
- Updated dependencies [8c384e1]
- Updated dependencies [127139c]
  - @ez-kit/store-core@0.3.0

## 0.5.1

### Patch Changes

- Updated dependencies [96231cd]
  - @ez-kit/store-core@0.2.1

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

  **`@ez-kit/va-store` only — BREAKING:** the `Item` render-prop child now receives `{ snap, store }` (read via `snap`, write via the raw `store` proxy) instead of just `snap`.

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

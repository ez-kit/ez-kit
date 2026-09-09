# @ez-kit/store-core

## 0.4.0

### Minor Changes

- b0580ea: Rename the render-prop slots: `Item` → `Subscribe`, and va-store's `StoreItem` → `Store`.

  **Breaking.** `Item` collided with the ecosystem-wide meaning of `Item` (`Select.Item`, `DropdownMenu.Item`, `ListBox.Item`), where it names one entry of a collection. These components name a subscription boundary, not a row. `Subscribe` says what it does and matches the shape TanStack Form uses for the same job. In va-store the two components now mirror the two hooks: `Subscribe` is the render-prop form of `useSnapshot()`, `Store` the render-prop form of `useStore()` — the latter still hands over the raw proxy without subscribing.

  Renamed alongside them, on `createContextStore`, `createStore` and the `createStoreCache` groups:
  - `ItemProps` → `SubscribeProps`, `ItemRenderArg` → `SubscribeRenderArg`
  - `CachedItemProps` → `CachedSubscribeProps`, `CachedItemRenderArg` → `CachedSubscribeRenderArg`
  - `StoreItemProps` → `StoreProps`, `CachedStoreItemProps` → `CachedStoreProps`

  Migration is a rename: `<store.Item>` → `<store.Subscribe>`, `<store.StoreItem>` → `<store.Store>`.

- b0580ea: Rename the cached store group's imperative read: `fromCache` → `getFromCache`.

  **Breaking.** `fromCache` was the only member of the group named as a prepositional phrase rather than a verb, next to
  `remove`, `keys` and `clear`. `getFromCache({ path, id })` states the operation and reads as the imperative counterpart of
  the hook, which keeps its name — `useFromCache({ path, id }, selector)`, where `use` already carries the verb. Same shape
  as `queryClient.getQueryData` beside `useQuery`.

- b0580ea: **Breaking:** the `plugins` option is removed from `createContextStore` and `CachedStoreOptions` (so
  `createCachedStore` no longer takes it either). A capability is now attached to the store instance
  itself, inside the factory, instead of passed as an array to the store options:

  ```tsx
  // Before
  createContextStore(() => proxy(new Filters()), { plugins: [persist()] })

  // After
  createContextStore(() => pipe(proxy(new Filters()), withPersist()))
  ```

  `@ez-kit/store-core` exports the new seam: `attachCapability(target, plugin)` registers a
  `StorePlugin` on the instance, under a non-enumerable, own-only property — invisible to
  `Object.keys`, a spread, `JSON.stringify`, and prototype inheritance — and `capabilitiesOf(target)`
  reads the list back, in **attachment order** (the innermost wrapper first). `createContextStore` and
  `createCachedStore` run every attached plugin's `setup` in that order on mount and the returned
  cleanups in reverse order on unmount, exactly as the old `plugins` option did. Attaching the same
  capability name twice (`pipe(store, withHistory(), withHistory())`) now throws instead of silently
  double-registering.

  `@ez-kit/va-store`'s `persist()` plugin is replaced by `withPersist(options?)`, a factory-position
  wrapper that mutates and returns the proxy it is applied to: `pipe(proxy({ … }), withPersist({ fields }))`.
  It composes with the new `withHistory` capability in the same chain — `pipe(proxy({ … }), withHistory(), withPersist())`.
  `persist()` itself still exists (it's what `withPersist` attaches under the hood) for anyone building
  a capability chain of their own, but `withPersist` is the documented entry point.

  See [Capabilities](https://ez-kit-docs.vercel.app/docs/va-store/capabilities) for the full shape and
  how to write your own.

- b0580ea: Extract persist into `@ez-kit/store-persist` and give Zustand stores URL/storage-as-state

  `persist()` used to live inside `@ez-kit/va-store` and reach the store through Valtio's `subscribe`
  and an in-place path write, so it was unusable from a Zustand store. The whole engine — bindings,
  codecs, URL/storage/IndexedDB adapters, provider — now lives in `@ez-kit/store-persist` and reaches
  a store only through a `StorePort`.
  - **`@ez-kit/store-core`** gains `StorePort` (`getState` / `write` / `subscribe`), the path helpers
    behind it (`readPath`, `parentOf`, `writePath`, `setPath`, `findPropertyDescriptor`) and
    `useCapabilities`, the shared mount seam both binding packages now use.
  - **`@ez-kit/zu-store`** gains the persist front: `pipe(createStore()(init), withPersist({ fields }))`,
    the `@ez-kit/zu-store/persist*` subpaths, a `StoreProvider`, `pipe` re-exported from store-core, and
    a `plugins` option on `createContextStore` for capabilities declared on the factory. Its port
    rebuilds only the touched paths and issues **one** `setState` per batch, so a multi-field hydration
    is a single state change.
  - **`@ez-kit/va-store`** keeps every `@ez-kit/va-store/persist*` import path unchanged — they now
    re-export the shared package with the Valtio port bound — and gains the same `plugins` option plus a
    `./persist/testing` subpath (`createFakePersistAdapter`, previously internal).

  Because a binding carries its own port, one mounted `PersistProvider` serves Valtio and Zustand
  stores in the same tree.

  **Breaking:** the default storage key changed from `va-store` to `ez-kit` (it is no longer a
  Valtio-only engine), so a store that relied on the default now starts from an empty blob. Pass
  `localStorageAdapter({ storageKey: 'va-store' })` to keep reading existing data. Error message
  prefixes changed from `[va-store] persist:` to `[store-persist]:` for the same reason.

- b0580ea: Fix several `withHistory` correctness issues in the shared `@ez-kit/store-core/history` engine, which
  `@ez-kit/zu-store`'s `withHistory` middleware builds on:
  - **`goto` no longer trims.** Jumping to an absolute timeline position used to run the same `limit`-cap
    trim as `record`, which could silently delete a reachable state instead of just reordering the
    existing timeline — `goto` introduces no new entries, so there was never anything for a cap to defend
    against. It now only reorders `[...pasts, current, ...futures]`.
  - **`undo` and `redo` are mutually inverse under an over-limit seed.** Trimming an over-limit stack
    (reachable via `defaultPasts` / `defaultFutures`, not just accumulation) used to drop from the wrong
    end on `undo`, discarding the very state `undo` had just put back instead of the farthest one. `undo`
    now trims `futures` from the tail, so the next `redo` lands where `undo` left it.
  - **`isPaused` is observable during `skip`.** A subscriber reading the published snapshot from inside
    `skip(fn)` now sees `isPaused: true` for `fn`'s duration, not just once it returns — useful for UI
    (e.g. a dimmed undo button) that reacts to the published state rather than calling `isPaused`
    directly.
  - **History publishes before the restore write**, not after — a subscriber reacting to `undo` / `redo`
    / `goto`'s resulting write now sees the new `pasts` / `futures` split already in place.
  - **Redundant `pause()` / `resume()` no longer notify.** Calling either when already in that state is
    now a no-op — no snapshot publish — instead of firing a needless notification.
  - **`HistorySnapshot`'s fields (`pasts`, `futures`, `limit`, `isPaused`) are now `readonly`**, matching
    that a subscriber should never mutate a published snapshot in place.

- b0580ea: Add `pipe` and the `StoreEnhancer<In, Out>` type, and make every `with*` wrapper curried. A
  capability chain is now written in attachment order instead of inside out:

  ```tsx
  // Before
  createContextStore(() => withPersist(withHistory(proxy({ q: '' }), { defaultPaused: true }), { fields }))

  // After
  createContextStore(() => pipe(proxy({ q: '' }), withHistory({ defaultPaused: true }), withPersist({ fields })))
  ```

  `pipe(base, ...enhancers)` is `enhancers.reduce((target, enhance) => enhance(target), base)` with
  overloads that carry the widened type through each step, so the chain's result type still names every
  capability it picked up. Reading it top to bottom now matches the order the Provider replays each
  capability's `setup` in, which is the order the persist + history recipe depends on.

  `withHistory(target, options?)` and `withPersist(target, options?)` are therefore replaced by
  `withHistory(options?)` and `withPersist(options?)`, which return the enhancer. Currying is what types
  the options: the enhancer's state type comes from the value `pipe` feeds it, so
  `withHistory({ shouldRecord: (prev, next) => prev.q !== next.q })` types both parameters as the store's
  own state without an annotation. An enhancer applied outside `pipe` has nothing to infer from, so name
  the state there: `withHistory<Filters>()(proxy({ q: '' }))`.

  Both wrappers still mutate the proxy they are applied to and return the same identity, and nothing is
  attached until the enhancer runs — a named enhancer (`const historic = withHistory<Filters>({ limit: 50 })`)
  can seed several stores, each with its own stack.

## 0.3.0

### Minor Changes

- c73fef9: Add controlled `value` support alongside `defaultValue`. `Provider` now accepts an optional `value` (a `Partial<TState>` slice owned by the parent) and `onValueChange` (the callback fed by the store's own writes), so a store field can be mirrored to and from external state instead of only being seeded once. Both are additive — no breaking changes.

  `defaultValue` still seeds the store once on creation; `value` then wins for the keys it lists, applied synchronously so the first frame is already correct (no seed flash, and SSR-safe since it does not rely on an effect). Later prop changes sync into the store via `useLayoutEffect`, compared key by key — `Object.is` by default, or a custom `equals` when declared — never by the `value` object's own reference. Only the keys that actually changed are written, through a custom `set` when declared or a direct write otherwise. A field written locally without a matching `onValueChange` intentionally drifts from `value` until the next prop change — mirror mode, not `<input value>`-style enforcement. `onValueChange` emits only the keys present in the current `value`, and never re-emits a change the Provider itself just applied from a prop sync (anti-echo).

  New in `@ez-kit/store-core`: `ControlledConfig`/`ControlledFieldConfig` (the per-key `equals`/`set` override type), `shallowEqual` (a ready-made `equals` for values that get a fresh reference every render, e.g. `value={{ users: transform(dto) }}`), `getChangedControlledEntries`, and `pickControlledKeys`.

  `createContextStore` (`@ez-kit/zu-store`) and `createStore`/`createContextStore` (`@ez-kit/va-store`) both take a new `controlled` option — a map of per-key `{ equals?, set? }` overrides — with identical prop and option names across the two packages.

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

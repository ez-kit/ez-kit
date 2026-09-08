# @ez-kit/zu-store

## 0.7.0

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

- b0580ea: Add a `shallow` prop to `Subscribe`, on both `createContextStore` and `createStoreCache` groups.

  `Subscribe` read through `useSelector`, so its `selector` was always compared with `Object.is` and had no shallow counterpart — a selector that builds an object or array (`(s) => ({ a: s.a, b: s.b })`) threw `Maximum update depth exceeded` on mount, with `useShallowSelector` in a surrounding component the only way out. `shallow` makes `Subscribe` compare the selection shallowly, exactly as `useShallowSelector` does:

  ```tsx
  <counterStore.Subscribe
  	selector={(s) => ({ count: s.count, label: s.label })}
  	shallow
  >
  	{({ count, label }) => <span>{`${String(count)} · ${label}`}</span>}
  </counterStore.Subscribe>
  ```

  The prop defaults to `false`, so existing `Subscribe` usage is unchanged. It selects one of two internal components — one reading through `useSelector`, one through `useShallowSelector` — so toggling it on a mounted `Subscribe` remounts the render-prop subtree. `shallow` describes the selector, which is written once per call site, so that is not a state a real tree passes through.

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

- b0580ea: Add `useHistory(store)` and `useTimeline(store)` — the two history hooks `@ez-kit/va-store` already
  ships, in Zustand's shape.

  `useHistory` takes one subscription to the `history` sub-store and returns the stacks, the controls
  and derived `canUndo` / `canRedo` as a single object, so a toolbar stops hand-selecting four fields
  off `store.history`:

  ```diff
  - const canUndo = useStore(store.history, (h) => h.pasts.length > 0)
  - const undo = useStore(store.history, (h) => h.undo)
  + const { undo, canUndo } = useHistory(store)
  ```

  `useTimeline` assembles `[...pasts, current, ...futures]` with the index the store sits on, for the
  UIs that render the timeline itself — a step strip, a "3 of 7" read-out, anything driving `goto()`.
  It stays a separate hook because reading `current` means subscribing to the store's whole state; on
  `useHistory` that cost would land on every caller, including a toolbar that only wanted `undo`.

  Also declares the optional peers the persist subpaths need (`next`, `react-router`, `zod`), which
  were reachable only transitively through `@ez-kit/store-persist`, and puts the
  `persist/url/react-router` bundle under a size-limit budget.

### Patch Changes

- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
  - @ez-kit/store-core@0.4.0
  - @ez-kit/store-persist@0.1.0

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

# @ez-kit/va-store

## 0.4.0

### Minor Changes

- 3d5b53c: One extension seam, one history vocabulary, matching subpath maps

  **Breaking.** `createContextStore`'s `plugins` option is gone from both binding packages, and
  `useCapabilities` no longer takes an `extra` list. A capability runs because it is attached to the
  store instance — by a `with*` wrapper in the factory chain, or by a hand-written
  `attachCapability(store, plugin)` — so there is no second, factory-level channel to reconcile with
  the wrappers a store was actually built with. Migration: move `{ plugins: [persist({ fields })] }`
  into the factory as `pipe(store, withPersist({ fields }))`, or call `attachCapability` there.

  **Breaking (`@ez-kit/va-store`).** The two Valtio-prefixed history types are renamed to the names
  their `@ez-kit/zu-store` counterparts already use: `ValtioHistoryOptions` → `HistoryOptions`,
  `ValtioOp` → `HistoryOp`. Both packages now also re-export `HistorySnapshot`, so the live stacks
  behind `store.history` can be annotated without reaching into `@ez-kit/store-core`.

  **Breaking (`@ez-kit/zu-store`).** `CreateContextStoreOptions` lost its now-unused first type
  parameter — it is `CreateContextStoreOptions<TState>`, matching `@ez-kit/va-store`.

  **Breaking (`@ez-kit/zu-store`).** The cache's missing-provider error now reads
  `Missing CacheProvider`, matching `@ez-kit/va-store` — the old `Missing StoreCacheProvider` named a
  component that does not exist (the provider is `CacheProvider`, or `cache.Provider`). Only code that
  matched on the message text is affected; the exported `MISSING_CACHE_PROVIDER` constant is unchanged.

  **New (`@ez-kit/zu-store`).** History is available on its own subpath, `@ez-kit/zu-store/history`,
  mirroring `@ez-kit/va-store/history`; the root export is unchanged.

- ff74e84: Align the two store bindings ahead of 1.0, and give every package one message format.

  `@ez-kit/zu-store` gains the `Store` slot `@ez-kit/va-store` already had — a write-only render prop
  that hands over the raw store handle without subscribing, on both `createContextStore` and a
  `createCachedStore` group. `Subscribe` now passes that handle to its children as a second argument
  in both places, so a render prop that reads _and_ writes needs no hook beside it. Both are additive;
  existing render props ignore the extra argument.

  Two names are unified across the bindings, so the same concept is spelled the same way in both.
  `@ez-kit/va-store`'s `Subscribe` render prop now takes its two arguments **positionally** —
  `{(snap, store) => …}` instead of `{({ snap, store }) => …}` — matching `zu-store`'s
  `{(state, store) => …}`, on both `createContextStore` and a `createCachedStore` group; the
  `SubscribeRenderArg` / `CachedSubscribeRenderArg` types that existed only to name that object are
  gone. And `@ez-kit/zu-store`'s `HistoryState<T>` is renamed **`StoreHistory<T>`**, the name
  `va-store` already used for the same thing — the public `store.history` surface.

  Every user-facing error and warning across the four packages now starts with its package tag —
  `[zu-store]`, `[va-store]`, `[store-core]`, `[store-persist]` — with the tag held in one constant per
  package instead of being spelled out at each call site. Two message texts changed as a result:
  `zu-store`'s missing-Provider error now names the store, as `va-store`'s already did
  (`[zu-store] Missing Provider for filters`), and the exported `MISSING_CACHE_PROVIDER` constant reads
  `[zu-store] Missing <CacheProvider>` / `[va-store] Missing <CacheProvider>`. Match on the tag, not on
  the sentence — the new **Stability** docs page says so explicitly, alongside which import paths
  semver covers.

  The `./persist/internals` subpath is **removed** from both bindings. It re-exported the engine's own
  assembly primitives — the pieces a binding is built from — and binding a new state manager is not a
  supported extension point yet, so it committed us to 22 engine-level names with no documented
  consumer. Writing a **custom source adapter** is unaffected and stays fully public: implement
  `SourcePort` and ship it as an `AmbientAdapter` or `RenderScopedAdapter`, with every type for it on
  the binding's `persist` entry.

  Also: `keywords`, `bugs` and `engines` on all four published packages, and an enforced 80% coverage
  floor via a new `test:coverage` script.

### Patch Changes

- Updated dependencies [3d5b53c]
- Updated dependencies [ff74e84]
  - @ez-kit/store-core@0.5.0
  - @ez-kit/store-persist@0.2.0

## 0.3.0

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

- b0580ea: **Breaking:** `createStore` is removed — `createContextStore` is now the only store factory.

  The two were the same function: `createContextStore` was a one-line call onto `createStore` with a
  fixed store name, forwarding the same `plugins` and `controlled` and returning the same
  `{ Provider, useSnapshot, useStore, Subscribe, Store }`. `createContextStore` now takes the `name`
  option itself, so nothing is lost.
  - `createStore(factory, options)` → `createContextStore(factory, options)`.
  - Types `StoreInit`, `StoreFactory`, `CreateStoreOptions` and `CreateStoreResult` are gone; use
    `ContextStoreInit`, `CreateContextStoreFactory`, `CreateContextStoreOptions` and
    `CreateContextStoreResult`, which are the same shapes.
  - The default store name is now `'store'` for every store, so a missing Provider throws
    `Missing Provider for store` where `createContextStore` previously threw
    `Missing Provider for createContextStore`. Pass `{ name: 'filters' }` for a better message.

  `createCachedStore` is untouched: keep-alive is a lifetime/identity concern that owns instance
  creation (it is the layer that runs plugins), so it stays a separate factory rather than a plugin.

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

- b0580ea: **Breaking:** `withPersist` now returns `T & { $url: UrlHandle; $persist: PersistHandle }`, so the
  persist control handles are typed on a par with `withHistory`'s `history`.

  `store.$url.runWithMeta({ history: UrlHistory.Push }, () => { … })` type-checks straight off
  `useStore()`. `urlHandle()` / `persistHandle()` are unchanged and remain the way to reach a handle on
  a proxy whose type has been widened away.

  To make that type true rather than aspirational, both slots are now attached whatever the store
  declares. A store with no field for a slot gets an inert handle there — it runs the mutation without
  engine meta, exactly as a not-yet-connected handle does — and that handle's `source` is `null`, so
  `PersistHandle['source']` is now `string | null`. As a result `urlHandle()` / `persistHandle()` no
  longer throw for a `withPersist`ed proxy; the "no handle on this proxy" error now means only that the
  proxy never went through `withPersist`.
  - **Bindings are now built in the factory phase**, not on mount: `withPersist` constructs them and
    attaches the handles right away, so `$url`/`$persist` are on the returned type. Connecting a
    binding to its engine — and capturing its pristine default — still happens at connect time, in the
    capability's `setup`, exactly as before. There is no behaviour change: a field that is both
    controlled and persisted still keeps its controlled value across the first mount.

- b0580ea: Add `useTimeline(store)` — the assembled timeline of a `withHistory` store.

  `goto(index)` addresses `[...pasts, current, ...futures]`, but `current` was the one part of that a
  caller had to rebuild by hand, field by field, from a snapshot. `useTimeline` returns it assembled:
  `steps` (the full timeline), `index` (`pasts.length`, so `steps[index] === current`), `current` (the
  live state shaped like a step — the store's fields, without `history`), and `goto`.

  It is a separate hook rather than more fields on `useHistory` because assembling `current` means
  `useSnapshot(store)`, and valtio re-renders a component on any store write once it snapshots the
  store — even one that reads nothing off the snapshot. On `useHistory` that cost would land on every
  caller, including a toolbar that only wanted `undo` / `redo`; on `useTimeline` it lands only where
  the state is rendered anyway.

- b0580ea: Add `withHistory` and `useHistory` — an undo/redo/goto capability for any Valtio proxy, built on the
  same manager-agnostic `@ez-kit/store-core/history` engine `@ez-kit/zu-store`'s `withHistory` uses:

  ```tsx
  import { createContextStore, pipe, useHistory, withHistory } from '@ez-kit/va-store'
  import { proxy } from 'valtio'

  const store = createContextStore(() => pipe(proxy({ count: 0 }), withHistory()))

  function Toolbar() {
  	const { undo, redo, canUndo, canRedo } = useHistory(store.useStore())
  	// …
  }
  ```

  `withHistory` composes with `withPersist` in a `pipe` — `pipe(proxy({ … }), withHistory(), withPersist())` — as
  capabilities attached to the same proxy (see the `@ez-kit/store-core`/`@ez-kit/va-store` capability
  changeset in this release). `store.history` is enumerable and `ref()`-wrapped, so `snapshot()` exposes
  the same live object rather than a deep-cloned copy, and its `toJSON()` returns `undefined` so it never
  reaches `JSON.stringify(store)`.

  Applying the enhancer flips on Valtio's `unstable_enableOp` globally for the process (needed for
  `shouldRecord` and `sync: true`'s per-operation granularity) — harmless for `subscribe()` callers that
  ignore their `ops` argument, but process-wide once any store calls it.

  See [History](https://ez-kit-docs.vercel.app/docs/va-store/history) for the full option table, the
  honest cost of using history (deep clone on record; `ref`/class-typed values don't time-travel), and
  the `defaultPaused` + `useHydrated` recipe for combining it with `withPersist`.

### Patch Changes

- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
  - @ez-kit/store-core@0.4.0
  - @ez-kit/store-persist@0.1.0

## 0.2.0

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

## 0.1.0

### Minor Changes

- a7fbfac: Initial release of `@ez-kit/va-store` — a Valtio-backed React context store, sibling to
  `@ez-kit/zu-store`.
  - `createContextStore(factory)` returns `{ Provider, useSnapshot, useContextStore, Item }`:
    `useSnapshot()` is the readonly auto-tracked read path, `useContextStore()` is the raw mutable
    proxy (mutate directly, e.g. `state.count++`) and does not subscribe the calling component. Both
    are seeded through a single `defaultValue` envelope (`ContextStoreInit<T>`), and `Item` receives
    `{ snap, store }`.
  - `createStore(factory, { plugins })` is the plugin-capable base factory; `createStoreCache` /
    `createCachedStore` add a keyed instance cache in which a hit returns the same live proxy, so
    in-progress mutations survive unmount/remount within `gcTime`.
  - `StoreProvider({ persist?, cache? })` is the app-level composition root.
  - The `persist` subsystem (`@ez-kit/va-store/persist`) is a source-agnostic two-way sync engine —
    the proxy is the synchronous source of truth, the substrate a throttled, rehydratable mirror.
    Adapters ship behind peer-gated subpaths: `/persist/url` (+ `/url/react-router`, `/url/next`),
    `/persist/storage` (`localStorage` / `sessionStorage` / IndexedDB with cross-tab sync and
    `version`/`migrate`), and `/persist/validators/zod`.

### Patch Changes

- Updated dependencies [96231cd]
  - @ez-kit/store-core@0.2.1

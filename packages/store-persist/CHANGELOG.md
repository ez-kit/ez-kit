# @ez-kit/store-persist

## 1.0.0

### Major Changes

- ec55356: 1.0 — the store packages' public API comes under semver.

  This release is the promise, not a rewrite: nothing in it changes behaviour on its own. What ships is
  the surface `@ez-kit/zu-store` 0.8, `@ez-kit/va-store` 0.4, `@ez-kit/store-core` 0.5 and
  `@ez-kit/store-persist` 0.2 already shipped. What ends is the 0.x convention of landing a breaking
  change as a minor. From here a break in any of the four is a major there, and a break in the shared
  foundation that surfaces through a binding is a major in that binding too.

  The four version **independently** from here. They reach 1.0 together because they are one surface cut
  into a foundation, an engine and two bindings — but a feature in `@ez-kit/zu-store` does not move
  `@ez-kit/va-store`, and an engine fix does not move a binding it did not change. Never read two matching
  version numbers as a compatibility statement: the binding's own dependency range on `@ez-kit/store-core`
  and `@ez-kit/store-persist` is what says which versions pair.

  Covered: the binding root and its `history`, `persist`, `persist/storage`, `persist/url`,
  `persist/url/next`, `persist/url/react-router`, `persist/validators/zod` and `persist/testing`
  subpaths, plus `@ez-kit/store-core` and `@ez-kit/store-persist` themselves. Writing a **custom source
  adapter** is covered — it is a `SourcePort`, and every type it needs is on the `persist` entry.

  Not covered: `@ez-kit/store-persist/internals`, the engine's assembly primitives — binding a new state
  manager to this engine is not a supported extension point yet; anything reached through a deep file
  path; and the exact wording of error and warning messages, whose `[zu-store]` / `[va-store]` /
  `[store-core]` / `[store-persist]` prefix is stable so they can be filtered on the tag.

  The full statement, including the supported React / Zustand / Valtio / Node ranges, is on the Stability
  page: https://ez-kit-docs.vercel.app/docs

### Minor Changes

- ec55356: Report an async source's I/O failure to the application: `PersistProvider`'s `onError`, forwarded from
  `StoreProvider` as `onPersistError`.

  `SourcePort` is a public, documented extension point — a cookie, a REST endpoint, a WebSocket — and
  until now a custom **async** adapter had nowhere to put a failure. The engine already carried an
  `onError` option, but `PersistProvider` copied only `mergeMeta` and `defaultMeta` into it, so nothing
  public could reach it: a rejected `get()` or `set()` was dropped on the floor. It now arrives as
  `onError(error, { source })`, naming the source that produced it, so an app can raise a toast, retry, or
  report telemetry. The handler is read at call time, so passing a fresh closure each render does not
  re-create the engines.

  Synchronous sources are unaffected — the URL port cannot reject, and the built-in storage adapter keeps
  absorbing quota and private-mode errors behind its one-time `console.warn`. With no handler the
  behaviour is exactly as before: the rejection is swallowed and the store stays the source of truth.

  Fixed alongside it: the plugin's synchronous seed called `engine.snapshot()` and discarded the promise
  an async port returns without settling it, so a failing async adapter raised an **unhandled rejection**
  during mount — fatal under Node's default `--unhandled-rejections=throw`. The discarded copy is now
  settled; `connect` still reads the source and reports the failure through `onError`.

### Patch Changes

- Updated dependencies [ec55356]
  - @ez-kit/store-core@1.0.0

## 0.2.0

### Minor Changes

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

## 0.1.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
  - @ez-kit/store-core@0.4.0

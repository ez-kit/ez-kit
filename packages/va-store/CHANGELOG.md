# @ez-kit/va-store

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

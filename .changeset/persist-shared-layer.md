---
'@ez-kit/store-persist': minor
'@ez-kit/store-core': minor
'@ez-kit/zu-store': minor
'@ez-kit/va-store': minor
---

Extract persist into `@ez-kit/store-persist` and give Zustand stores URL/storage-as-state

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

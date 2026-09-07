---
'@ez-kit/va-store': minor
---

**Breaking:** `createStore` is removed — `createContextStore` is now the only store factory.

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

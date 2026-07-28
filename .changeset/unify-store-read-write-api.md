---
'@ez-kit/store-core': minor
'@ez-kit/valtio-kit': minor
'@ez-kit/zu-store': minor
---

Unify the read/write API across the store packages. `useStore()` now means the same thing everywhere — the raw store handle, which never subscribes the caller — while the reactive read keeps a manager-specific name.

Breaking changes:

- `@ez-kit/zu-store`: `useContextStore()` → `useStore()`; the previous selector-based `useStore(selector)` → `useSelector(selector)`; `useShallowStore(selector)` → `useShallowSelector(selector)`. This applies to both `createContextStore` and cached groups from `createCachedStore`.
- `@ez-kit/valtio-kit`: `useContextStore()` → `useStore()`, for both `createStore`/`createContextStore` and cached groups. `useSnapshot()` is unchanged.
- `@ez-kit/store-core`: `CachedStoreGroup.useStore(selector)` → `useSelector(selector)`, so the low-level selector read no longer collides with the new meaning of `useStore()`.

New in `@ez-kit/valtio-kit`: `StoreItem`, a write-only render-prop slot next to `Item`. Its child receives the raw proxy and, because nothing subscribes to a snapshot, store mutations never re-render it — useful for controls that only write. It is available on `createStore`/`createContextStore` results and on cached groups. Note it is not memoised: it still re-renders with its parent.

These packages are pre-1.0, so the break ships as a minor bump.

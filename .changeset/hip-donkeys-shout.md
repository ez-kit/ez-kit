---
'@ez-kit/store-core': minor
'@ez-kit/zu-store': minor
'@ez-kit/va-store': minor
---

Rename the render-prop slots: `Item` → `Subscribe`, and va-store's `StoreItem` → `Store`.

**Breaking.** `Item` collided with the ecosystem-wide meaning of `Item` (`Select.Item`, `DropdownMenu.Item`, `ListBox.Item`), where it names one entry of a collection. These components name a subscription boundary, not a row. `Subscribe` says what it does and matches the shape TanStack Form uses for the same job. In va-store the two components now mirror the two hooks: `Subscribe` is the render-prop form of `useSnapshot()`, `Store` the render-prop form of `useStore()` — the latter still hands over the raw proxy without subscribing.

Renamed alongside them, on `createContextStore`, `createStore` and the `createStoreCache` groups:

- `ItemProps` → `SubscribeProps`, `ItemRenderArg` → `SubscribeRenderArg`
- `CachedItemProps` → `CachedSubscribeProps`, `CachedItemRenderArg` → `CachedSubscribeRenderArg`
- `StoreItemProps` → `StoreProps`, `CachedStoreItemProps` → `CachedStoreProps`

Migration is a rename: `<store.Item>` → `<store.Subscribe>`, `<store.StoreItem>` → `<store.Store>`.

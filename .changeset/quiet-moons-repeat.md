---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': patch
---

Stop controlled-state syncing from updating subscribed components during render.

`useDataGrid` mirrors the controlled `state` prop into the store from its render body — it has to, so that the same render reads the new values. But that write also notified subscribers, so a child like `PageSizer`, `GlobalFilterInput` or `Body` had its `useSyncExternalStore` callback run while the parent was still rendering, and React reported `Cannot update a component while rendering a different component` on every controlled grid.

The write is now silent and the notification is flushed from a layout effect, before paint. Children re-render within the same pass and read the fresh snapshot directly, so nothing lags; the flush only exists to wake a subscriber that bailed out of the pass.

Core gains two additions for this: `syncControlledState` takes an optional `{ silent }`, and `DataTable.notifyStateSubscribers()` flushes a silent write. Both default to the previous behaviour.

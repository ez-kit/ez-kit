---
'@ez-kit/store-core': minor
'@ez-kit/zu-store': minor
'@ez-kit/va-store': minor
---

One extension seam, one history vocabulary, matching subpath maps

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

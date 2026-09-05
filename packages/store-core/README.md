# @ez-kit/store-core

The shared foundation under the `@ez-kit` store packages — the parts that have nothing to do with any particular state manager.

You normally do not install this directly. [`@ez-kit/zu-store`](https://www.npmjs.com/package/@ez-kit/zu-store) (Zustand) and [`@ez-kit/va-store`](https://www.npmjs.com/package/@ez-kit/va-store) (Valtio) depend on it and re-export what an application needs. Reach for it when you are binding a **new** state manager to the same surface, or writing a plugin that must resolve services.

```bash
pnpm add @ez-kit/store-core
```

## Subpaths

| Import                       | Contains                                                          | Client-only |
| ---------------------------- | ----------------------------------------------------------------- | ----------- |
| `@ez-kit/store-core`         | store ids, service registry, plugin contract, capability registry | no          |
| `@ez-kit/store-core/react`   | `ServicesProvider`, `useServices`                                 | yes         |
| `@ez-kit/store-core/cache`   | the manager-agnostic keep-alive cache and its React layer         | yes         |
| `@ez-kit/store-core/history` | the manager-agnostic undo/redo stack (`createHistoryStack`)       | no          |

The root entry is deliberately free of React, so it stays importable from a server component; the two React subpaths ship a `'use client'` directive.

## What each part is for

**Store ids** — `StoreId` (`{ path, name, id }`) plus `serializeStoreId` / `deserializeStoreId`. One address shared by a singleton store and a cached one, so a plugin can key per-store state without knowing which it is talking to.

**Service registry** — `serviceKey`, `createServiceRegistry`, `extendServiceRegistry`, and the React pair `ServicesProvider` / `useServices`. App-level capabilities are published once near the root and resolved by plugins further down. `extendServiceRegistry` layers a scope onto the inherited one rather than replacing it, so nested providers keep everything an ancestor published.

**Plugin contract** — `StorePlugin`, `PluginContext`, `PluginCleanup`. A plugin's `setup(instance, ctx)` runs when the store's Provider mounts and its returned cleanup on unmount; `ctx` carries the resolved services, the store's id, and whether it is running on the server.

**Capability registry** — `attachCapability(target, plugin)` and `capabilitiesOf(target)`. This is the one extension seam every `with*` wrapper (`@ez-kit/va-store`'s `withPersist` and `withHistory`, `@ez-kit/zu-store`'s equivalents) hangs on: a wrapper attaches a `StorePlugin` to the instance itself, at construction time, instead of a store factory taking a `plugins` option. Capabilities live under a non-enumerable, own-only property — invisible to `Object.keys`, a spread, `JSON.stringify`, or prototype inheritance — in **attachment order** (innermost wrapper first); a store's Provider runs every attached plugin's `setup` in that order on mount and the returned cleanups in reverse on unmount. Attaching the same capability name twice throws, so `withHistory(withHistory(store))` fails fast instead of silently double-recording.

**History stack** — `@ez-kit/store-core/history`'s `createHistoryStack(adapter, options)`, manager-agnostic undo/redo/goto over a `HistoryAdapter<T>` (`read`/`write`/`onStateChange`). Both `@ez-kit/zu-store`'s `withHistory` middleware and `@ez-kit/va-store`'s `withHistory` capability build on this one engine, so `limit`, `defaultPaused`, `defaultPasts`, `defaultFutures` and `shouldRecord` mean the same thing in both packages.

**Instance cache** — `createInstanceCache` plus `createCacheReact`, which turns it into a React surface (`Provider`, `Scope`, `useCache`, `useCacheKeys`, `createCachedStore`) given a single manager-specific injection: `useRead(instance, selector)`. Zustand passes `useStore`, Valtio passes `useSnapshot`; everything else — keying by `(path, id)`, scope inheritance, GC timing, cross-tree reads — is shared. That is why both packages expose the same cache API without duplicating it. `CachedStoreOptions` (`{ name, gcTime? }`) carries no `plugins` field — a capability for a cached store is attached the same way as an uncached one, inside the `factory` passed to `createCachedStore`.

→ [Full docs](https://ez-kit-docs.vercel.app/docs)

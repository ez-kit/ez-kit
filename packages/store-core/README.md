# @ez-kit/store-core

The shared foundation under the `@ez-kit` store packages — the parts that have nothing to do with any particular state manager.

You normally do not install this directly. [`@ez-kit/zu-store`](https://www.npmjs.com/package/@ez-kit/zu-store) (Zustand) and [`@ez-kit/va-store`](https://www.npmjs.com/package/@ez-kit/va-store) (Valtio) depend on it and re-export what an application needs. Reach for it when you are binding a **new** state manager to the same surface, or writing a plugin that must resolve services.

```bash
pnpm add @ez-kit/store-core
```

## Subpaths

| Import                     | Contains                                                  | Client-only |
| -------------------------- | --------------------------------------------------------- | ----------- |
| `@ez-kit/store-core`       | store ids, service registry, plugin contract              | no          |
| `@ez-kit/store-core/react` | `ServicesProvider`, `useServices`                         | yes         |
| `@ez-kit/store-core/cache` | the manager-agnostic keep-alive cache and its React layer | yes         |

The root entry is deliberately free of React, so it stays importable from a server component; the two React subpaths ship a `'use client'` directive.

## What each part is for

**Store ids** — `StoreId` (`{ path, name, id }`) plus `serializeStoreId` / `deserializeStoreId`. One address shared by a singleton store and a cached one, so a plugin can key per-store state without knowing which it is talking to.

**Service registry** — `serviceKey`, `createServiceRegistry`, `extendServiceRegistry`, and the React pair `ServicesProvider` / `useServices`. App-level capabilities are published once near the root and resolved by plugins further down. `extendServiceRegistry` layers a scope onto the inherited one rather than replacing it, so nested providers keep everything an ancestor published.

**Plugin contract** — `StorePlugin`, `PluginContext`, `PluginCleanup`. A plugin's `setup(instance, ctx)` runs when the store's Provider mounts and its returned cleanup on unmount; `ctx` carries the resolved services, the store's id, and whether it is running on the server. This is the seam `@ez-kit/va-store`'s persist engine hangs on.

**Instance cache** — `createInstanceCache` plus `createCacheReact`, which turns it into a React surface (`Provider`, `Scope`, `useCache`, `useCacheKeys`, `createCachedStore`) given a single manager-specific injection: `useRead(instance, selector)`. Zustand passes `useStore`, Valtio passes `useSnapshot`; everything else — keying by `(path, id)`, scope inheritance, GC timing, cross-tree reads — is shared. That is why both packages expose the same cache API without duplicating it.

→ [Full docs](https://ez-kit-docs.vercel.app/docs)

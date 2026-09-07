# @ez-kit/store-persist

The persist engine behind [`@ez-kit/va-store`](../va-store) and [`@ez-kit/zu-store`](../zu-store):
URL, `localStorage` / `sessionStorage` and IndexedDB as state, with one coalesced commit per flush
and an equality guard that breaks the write → read → write loop.

**You normally do not install this package directly.** Each binding package re-exports the whole
surface with its own store port already bound, so an app writes one import path:

```ts
import { withPersist, paramString, StoreProvider } from '@ez-kit/va-store' // Valtio
import { withPersist, paramString, StoreProvider } from '@ez-kit/zu-store' // Zustand
```

See the [va-store persist docs](https://ez-kit-docs.vercel.app/docs/va-store/persist) for the full
API — fields, codecs, adapters, migrations, `useHydrated`, the `$url` / `$persist` handles.

## What this package is for

It exists so persistence is written once and works for every store manager. Two layers make that
possible:

- **`SourcePort`** — how a substrate is read and written. URL, storage and IndexedDB adapters live
  behind it; the engine speaks only `Map<string, string>` and never touches `URLSearchParams` or a
  storage API.
- **`StorePort`** (from [`@ez-kit/store-core`](../store-core)) — how a _store_ is read, written and
  observed. Valtio's port mutates the proxy in place; Zustand's rebuilds the touched path and issues
  one `setState`. The port lives on each binding, not on the engine, so one mounted `PersistProvider`
  serves Valtio and Zustand stores in the same tree.

## Writing a binding for another store manager

```ts
import { applyPersist } from '@ez-kit/store-persist'
import type { StorePort } from '@ez-kit/store-core'

const myPort: StorePort<MyStore> = {
	getState: (store) => store.getState(),
	write: (store, writes) => {
		/* apply every leaf in ONE state change */
	},
	subscribe: (store, onChange) => store.subscribe(onChange),
}

export function withPersist<T extends MyStore>(options = {}) {
	return (store: T) => {
		applyPersist(store, myPort, options)
		return store
	}
}
```

`applyPersist` builds the per-source bindings, attaches the `$url` / `$persist` handles and registers
the capability; mounting is the binding package's `createContextStore` (or the instance cache),
which runs `setup` once per instance. Low-level primitives — the engine factory, bindings, spec
resolution — are on the `@ez-kit/store-persist/internals` subpath.

## Subpaths

| Subpath                            | What's in it                                                            |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `.`                                | plugin + provider, handles, codecs, field fronts, core types            |
| `./internals`                      | engine, bindings, spec resolution — for adapter authors                 |
| `./storage`                        | `localStorage` / `sessionStorage` / IndexedDB adapters and field fronts |
| `./url`                            | the URL source: driver contract, `persistUrl` / `urlField`              |
| `./url/react-router`, `./url/next` | router adapters (peer-gated)                                            |
| `./validators/zod`                 | Zod-validated parsers                                                   |
| `./testing`                        | `createFakePersistAdapter` — an in-memory substrate for tests           |

## License

MIT

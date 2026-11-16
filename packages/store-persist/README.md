# @ez-kit/store-persist

The persist engine behind [`@ez-kit/va-store`](../va-store) and [`@ez-kit/zu-store`](../zu-store):
URL, `localStorage` / `sessionStorage` and IndexedDB as state, with scoped records, automatic
restoration, acknowledged mutation ordering and guards against write → read → write loops.

**You normally do not install this package directly.** Each binding package re-exports the whole
surface with its own store port already bound, so an app writes one import path:

```ts
import { withPersist, paramString } from '@ez-kit/va-store/persist' // Valtio
import { withPersist, paramString } from '@ez-kit/zu-store/persist' // Zustand
```

See the [va-store persist docs](https://ez-kit-docs.vercel.app/docs/va-store/persist) for the full
API — fields, codecs, adapters, migrations, `useHydrated`, the `$url` / `$persist` handles.

**Stability.** It is published because both bindings depend on it at runtime — it will appear in your
lock file whether or not you import it. Its API is **public, not internal**: each binding re-exports
every subpath verbatim, so a change here is a change to `@ez-kit/zu-store` and `@ez-kit/va-store`'s
own surface. The four store packages version independently; the binding's dependency ranges define compatibility.
`./internals` is an assembly surface without a consumer semver promise and is not re-exported by bindings.
Applications and custom source adapters use their binding's public persist entries.

The scoped persistence release is an explicitly approved **breaking minor** exception. It removes
`zodParam`, adds automatic restoration/status and makes addresses and patch semantics standard,
without a mode switch. See [MIGRATION.md](./MIGRATION.md) for upgrade, pinning and rollback guidance.

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
| `./testing`                        | `createFakePersistAdapter` — an in-memory substrate for tests           |

## License

MIT

## Source policy and control

Shared restoration options can be overridden by effective source name:

```ts
withPersist({
	restore: {
		timeoutMs: 2000,
		sources: { draftsApi: { timeoutMs: 10000, externalChanges: 'apply' } },
	},
	fields,
})
```

Each source starts automatically with its effective policy; joining a pending restore keeps its
existing deadline. Field helpers/decorators accept source aliases and preserve unknown decoder plus
typed-validator composition. Explicit handle names and reset paths are validated before mutation.
Bindings keep independent throttle windows. Flush acknowledges applicable record and namespace
operations, including staged container rewrites; source errors retain independent scope boundaries.

Custom adapters that stage container migration implement optional `rewriteContainer(values)`;
public mutation metadata never authorizes whole-container replacement. Built-in IndexedDB adapters
provision multiple object stores within one database and cooperate with versionchange upgrades.

Existing throttleMs/clearOnDefault are shared write defaults. Override individual sources with
`write: { sources: { draftsApi: { throttleMs: 500, clearOnDefault: false } } }`; missing members
inherit, and unknown source aliases fail before I/O. Set `restore.sources.draftsApi.timeoutMs` to
null for unlimited waiting despite a finite shared timeout. `handle.restore` uses timeout-only
RestoreCallOptions; externalChanges remains in the lifecycle RestoreOptions.

All bindings capture defaults before any source restores. Retained handles cannot acknowledge
unsaved detached work; disposed reset operations reject promptly. The IndexedDB adapter has no
automatic cross-tab notifications: use explicit restore to read a foreign write.

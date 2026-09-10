# @ez-kit/va-store

Valtio utilities for React — context-scoped proxies with Provider isolation.

## Install

```bash
pnpm add @ez-kit/va-store valtio
```

## API

### `createContextStore(factory)`

Wraps a Valtio proxy in React context. Returns `Provider`, `useSnapshot`, `useStore`, `Subscribe`, and `Store`. Multiple `Provider` instances are fully independent.

Unlike `@ez-kit/zu-store`, there are no selectors — Valtio tracks accessed properties automatically. Read from `useSnapshot()`, mutate the raw proxy from `useStore()`.

The two components mirror the two hooks: `Subscribe` is the render-prop form of `useSnapshot()` (`(snap, store)`), `Store` the render-prop form of `useStore()` — it hands over the raw proxy without subscribing, so store mutations never re-render it.

```tsx
import { type ContextStoreInit, createContextStore } from '@ez-kit/va-store'
import { proxy } from 'valtio'

const counter = createContextStore(({ defaultValue }: ContextStoreInit<{ count?: number }>) =>
  proxy({ count: defaultValue.count ?? 0 }),
)

<counter.Provider defaultValue={{ count: 10 }}>
  <MyComponent />
</counter.Provider>

// inside MyComponent:
const snap = counter.useSnapshot() // read  → snap.count
const state = counter.useStore() // write → state.count += 1
```

→ [Full docs](https://ez-kit-docs.vercel.app/docs/va-store/create-context-store)

### `createCachedStore(factory, options)` / `createStoreCache(options?)`

Keeps `createContextStore`-style stores alive across `Provider` unmount/remount, keyed by
`(path, name, id)`, in memory (no `localStorage`) — so table filters or pagination survive a navigation.
`createContextStore` is left untouched; this is a separate, opt-in primitive with the same surface as
[`@ez-kit/zu-store`](https://www.npmjs.com/package/@ez-kit/zu-store)'s.

```tsx
import { CacheProvider, CacheScope, createCachedStore } from '@ez-kit/va-store'
import { proxy } from 'valtio'

const usersTable = createCachedStore(({ defaultValue }) => proxy({ filter: defaultValue.filter ?? 'all' }), {
	name: 'users',
})

// once, high in the tree
<CacheProvider>
	{/* <CacheScope> namespaces by location so two pages never collide on the same id */}
	<CacheScope path={['page-1']}>
		<usersTable.Provider id='users' defaultValue={{ filter: 'active' }}>
			<UsersTable />
		</usersTable.Provider>
	</CacheScope>
</CacheProvider>

// imperatively, from anywhere — address the absolute { path, id }
const live = usersTable.getFromCache({ path: ['page-1'], id: 'users' })
if (live) live.filter = 'archived'
```

A capability attached in the factory lives as long as the **cache entry**, not as long as one `Provider`
mount — so a cached, persisted store keeps syncing while nothing renders it.

→ [Full docs](https://ez-kit-docs.vercel.app/docs/va-store/cache)

---

### History

`pipe(proxy(...), withHistory(options?))` adds an undo/redo stack, backed by the same
`@ez-kit/store-core/history` engine every `@ez-kit/*` store uses:

```tsx
import { pipe, useHistory, withHistory } from '@ez-kit/va-store'
import { proxy } from 'valtio'

const state = pipe(proxy({ count: 0 }), withHistory())

function Toolbar() {
	const { undo, redo, canUndo, canRedo } = useHistory(state)
	return (
		<>
			<button
				disabled={!canUndo}
				onClick={undo}
			>
				Undo
			</button>
			<button
				disabled={!canRedo}
				onClick={redo}
			>
				Redo
			</button>
		</>
	)
}
```

Applying `withHistory`'s enhancer flips on Valtio's `unstable_enableOp` globally for the process — it's how
`subscribe` gets real operation payloads instead of always-empty ones, and it's what lets
`shouldRecord` inspect which paths changed. This is harmless (every other `subscribe()` call in
this codebase ignores its op argument) but it is process-wide: once any store in your app calls
`withHistory`, every Valtio proxy's `subscribe` callbacks start receiving populated `ops` instead
of `[]`.

### Persist

Mirror a Valtio store into an external substrate — the URL, `localStorage`/`sessionStorage`, IndexedDB, or your own — and back, in both directions. The proxy stays the **synchronous** source of truth; the substrate is a throttled, rehydratable projection of it.

One source-agnostic engine drives every substrate. Its only interchange language is `Keyed = Map<string, string>`; a **source adapter** teaches the engine how to read and write one substrate through a tiny port (`get` / `set` / optional `subscribe`). Codecs, key naming, throttling, loop-breaking, and hydration are shared, so a single field can sync to two substrates at once and async sources (IndexedDB) never stall the synchronous URL.

```tsx
import { createContextStore } from '@ez-kit/va-store'
import { PersistProvider, withPersist } from '@ez-kit/va-store/persist'
import { persistUrl } from '@ez-kit/va-store/persist/url'
import { reactRouterAdapter } from '@ez-kit/va-store/persist/url/react-router'
import { persistLocalStorage, localStorageAdapter } from '@ez-kit/va-store/persist/storage'
import { proxy } from 'valtio'

// Decorate the fields to sync. Primitives need no parser — it's auto-resolved.
class Filters {
	@persistUrl() q = '' // → ?q=…
	@persistLocalStorage() density = 'comfortable' // → localStorage
}

// Persistence is a capability attached to the proxy in the factory. Request-scoped, SSR-correct.
// `withPersist` with no `fields` discovers the decorators.
const filtersStore = createContextStore(() => pipe(proxy(new Filters()), withPersist()))

function Page() {
	return (
		<PersistProvider adapters={[reactRouterAdapter, localStorageAdapter()]}>
			<filtersStore.Provider>
				<Filters />
			</filtersStore.Provider>
		</PersistProvider>
	)
}
```

Read with `useSnapshot()`, write through the raw proxy from `useStore()`. Storage adapters are inert on the server; gate on `useHydrated(store)` when the post-hydration fill would cause a flash. Can't use build-time decorators? Pass the accessor builder instead — `pipe(proxy({ q: '' }), withPersist({ fields: (field) => [field((s) => s.q, urlField())] }))` — and the builder's selectors are typed against the proxy `pipe` feeds the enhancer.

`withPersist` composes with [`withHistory`](#history) — `pipe(proxy({ … }), withHistory(), withPersist())`, in attachment order — as they're both [capabilities](https://ez-kit-docs.vercel.app/docs/va-store/capabilities) attached to the same proxy.

Subpaths (optional peers, install only what you use):

| Import                                      | Peer              |
| ------------------------------------------- | ----------------- |
| `@ez-kit/va-store/persist`                  | — (zero-dep core) |
| `@ez-kit/va-store/persist/url`              | — (zero-dep core) |
| `@ez-kit/va-store/persist/storage`          | — (zero-dep core) |
| `@ez-kit/va-store/persist/url/react-router` | `react-router`    |
| `@ez-kit/va-store/persist/url/next`         | `next`            |
| `@ez-kit/va-store/persist/validators/zod`   | `zod`             |

→ [Full docs](https://ez-kit-docs.vercel.app/docs/va-store/persist)

# @ez-kit/zu-store

Zustand utilities for React — context-scoped stores, ergonomic field bindings, undo/redo, a keep-alive
store cache, and a persist capability that mirrors state to the URL or storage.

## Install

```bash
pnpm add @ez-kit/zu-store zustand
```

## API

### `createContextStore(factory)`

Wraps a Zustand store in React context. Returns `Provider`, `useSelector`, `useShallowSelector`, `useStore`, `Subscribe`, and `Store`. Multiple `Provider` instances are fully independent.

Reads go through `useSelector(selector)` (or `useShallowSelector` for object/array selections); `useStore()` hands back the raw `StoreApi` without subscribing the caller. `Subscribe` is the render-prop form of `useSelector` — it takes `shallow` for the same object/array case, and hands the raw handle to its children as a second argument. `Store` is its write-only counterpart: the handle without a subscription, so store writes never re-render it.

```tsx
const counterStore = createContextStore(({ defaultValue }: ContextStoreInit<{ count?: number }>) =>
  createStore<{ count: number; increment: () => void }>()((set) => ({
    count: defaultValue.count ?? 0,
    increment: () => set((s) => ({ count: s.count + 1 })),
  })),
)

<counterStore.Provider defaultValue={{ count: 10 }}>
  <MyComponent />
</counterStore.Provider>

// inside MyComponent:
const count = counterStore.useSelector((s) => s.count)
```

→ [Full docs](https://ez-kit-docs.vercel.app/docs/zu-store/create-context-store)

---

### `useStoreState(store, key)`

Binds a single store field to a `[value, setValue]` tuple — like `useState` backed by Zustand. Re-renders only when that field changes.

```tsx
const [name, setName] = useStoreState(formStore, 'name')
```

→ [Full docs](https://ez-kit-docs.vercel.app/docs/zu-store/use-store-state)

---

### `createCachedStore(factory, options)` / `createStoreCache(options?)`

Keeps `createContextStore`-style stores alive across `Provider` unmount/remount, keyed by `(path, name, id)`, in memory (no `localStorage`). Useful for preserving table filters, pagination, etc. between page navigations. `createContextStore` is left untouched — this is a separate, opt-in primitive.

The package ships a **ready-made default cache**: import `CacheProvider` and `createCachedStore` directly — no instance to create. `createCachedStore(factory, { name })` returns a namespaced store group with `Provider`, the usual read hooks, plus `getFromCache`, `useFromCache`, and `remove`. The `path` is inherited from `<CacheScope>`, so reusable components stay collision-free across mount locations.

```tsx
import { CacheProvider, CacheScope, createCachedStore } from '@ez-kit/zu-store'
import { createStore } from 'zustand/vanilla'

const usersTable = createCachedStore(
  ({ defaultValue }: ContextStoreInit<{ filter?: string }>) =>
    createStore<{ filter: string }>(() => ({ filter: defaultValue.filter ?? 'all' })),
  { name: 'users' },
)

// once, high in the tree
<CacheProvider>
  {/* survives unmount; reused on remount within gcTime */}
  {/* <CacheScope> namespaces by location so two pages never collide on the same id */}
  <CacheScope path={['page-1']}>
    <usersTable.Provider id="users" defaultValue={{ filter: 'active' }}>
      <UsersTable />
    </usersTable.Provider>
  </CacheScope>
</CacheProvider>

// imperatively, from anywhere — address the absolute { path, id }
usersTable.getFromCache({ path: ['page-1'], id: 'users' })?.setState({ filter: 'archived' })
```

Need an isolated cache or a custom default `gcTime`? Build your own with `createStoreCache({ gcTime })` — same surface, as instance members (`cache.Provider`, `cache.Scope`, `cache.useCache`, `cache.useCacheKeys`, `cache.createCachedStore`).

→ [Full docs](https://ez-kit-docs.vercel.app/docs/zu-store/cache)

---

### `withHistory(initializer, options?)`

Real Zustand `StateCreator` middleware that adds undo / redo / goto / skip to any store. Records every write — including those performed from inside actions via the inner `set`. Composes idiomatically with `persist`, `devtools`, `subscribeWithSelector`, and `immer`.

```tsx
import { withHistory } from '@ez-kit/zu-store'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

const store = createStore<{ count: number; inc: () => void }>()(
	withHistory((set) => ({
		count: 0,
		inc: () => set((s) => ({ count: s.count + 1 })),
	})),
)

store.getState().inc()
store.history.getState().undo()
```

Three idiomatic ways to read history — pick the one that matches what your code is doing:

- `store.history.getState()` for imperative reads (actions like `undo`/`redo`/`goto` are stable references — no subscription needed).
- `useStore(store.history, sel)` for reactive UI that renders based on history (disabled state, slider position, indicators).
- `store.history.subscribe(cb)` for keyboard shortcuts, autosave, devtools bridges, or any non-React code.

Avoid `useStore(store.history)` without a selector — it re-renders on every recorded write.

For per-call history suppression — both from external `setState` and from inside actions — use `store.history.getState().skip(fn)`.

History is also available on its own subpath, `@ez-kit/zu-store/history`, for a bundle that pulls in
nothing else from the package.

→ [Full docs](https://ez-kit-docs.vercel.app/docs/zu-store/history)

---

### Persist

Mirror a store into an external substrate — the URL, `localStorage`/`sessionStorage`, IndexedDB, or your
own — and back, in both directions. The store stays the **synchronous** source of truth; the substrate is
a throttled, rehydratable projection of it.

One source-agnostic engine drives every substrate. Its only interchange language is
`Keyed = Map<string, string>`; a **source adapter** teaches the engine how to read and write one
substrate through a tiny port (`get` / `set` / optional `subscribe`). Codecs, key naming, throttling,
loop-breaking, and hydration are shared, so a single field can sync to two substrates at once and async
sources (IndexedDB) never stall the synchronous URL.

```tsx
import { createContextStore, pipe, StoreProvider } from '@ez-kit/zu-store'
import { paramString, withPersist } from '@ez-kit/zu-store/persist'
import { localStorageAdapter } from '@ez-kit/zu-store/persist/storage'
import { reactRouterAdapter } from '@ez-kit/zu-store/persist/url/react-router'
import { createStore } from 'zustand/vanilla'

type Filters = { q: string; density: string }

// Persistence is a capability attached to the store handle in the factory. Request-scoped, SSR-correct.
const filtersStore = createContextStore(() =>
	pipe(
		createStore<Filters>()(() => ({ q: '', density: 'comfortable' })),
		withPersist({
			fields: (field) => [
				field((state) => state.q, { source: 'url', parser: paramString() }),
				field((state) => state.density, { source: 'localStorage', parser: paramString() }),
			],
		}),
	),
)

function Page() {
	return (
		<StoreProvider persist={[reactRouterAdapter, localStorageAdapter()]}>
			<filtersStore.Provider>
				<FiltersView />
			</filtersStore.Provider>
		</StoreProvider>
	)
}
```

Read with `useSelector()`, write through the handle from `useStore()`. Storage adapters are inert on the
server; gate on `useHydrated(store)` when the post-hydration fill would cause a flash. `withPersist`
widens the handle with the typed `$url` / `$persist` control handles, and a multi-field hydration lands
as a **single** `setState`, so selectors are notified once.

It composes with [`withHistory`](#withhistoryinitializer-options) — `pipe(createStore()(withHistory(init)), withPersist())`,
history innermost, so hydration is recorded (or paused) like any other write.

Subpaths (optional peers, install only what you use):

| Import                                      | Peer              |
| ------------------------------------------- | ----------------- |
| `@ez-kit/zu-store/persist`                  | — (zero-dep core) |
| `@ez-kit/zu-store/persist/url`              | — (zero-dep core) |
| `@ez-kit/zu-store/persist/storage`          | — (zero-dep core) |
| `@ez-kit/zu-store/persist/url/react-router` | `react-router`    |
| `@ez-kit/zu-store/persist/url/next`         | `next`            |
| `@ez-kit/zu-store/persist/validators/zod`   | `zod`             |

→ [Full docs](https://ez-kit-docs.vercel.app/docs/zu-store/persist)

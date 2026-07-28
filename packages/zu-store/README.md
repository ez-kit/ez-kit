# @ez-kit/zu-store

Zustand utilities for React — context-scoped stores and ergonomic field bindings.

## Install

```bash
pnpm add @ez-kit/zu-store zustand
```

## API

### `createContextStore(factory)`

Wraps a Zustand store in React context. Returns `Provider`, `useSelector`, `useShallowSelector`, `useStore`, and `Item`. Multiple `Provider` instances are fully independent.

Reads go through `useSelector(selector)` (or `useShallowSelector` for object/array selections); `useStore()` hands back the raw `StoreApi` without subscribing the caller.

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

→ [Full docs](docs/create-context-store.md)

---

### `useStoreState(store, key)`

Binds a single store field to a `[value, setValue]` tuple — like `useState` backed by Zustand. Re-renders only when that field changes.

```tsx
const [name, setName] = useStoreState(formStore, 'name')
```

→ [Full docs](docs/use-store-state.md)

---

### `createCachedStore(factory, options)` / `createStoreCache(options?)`

Keeps `createContextStore`-style stores alive across `Provider` unmount/remount, keyed by `(path, name, id)`, in memory (no `localStorage`). Useful for preserving table filters, pagination, etc. between page navigations. `createContextStore` is left untouched — this is a separate, opt-in primitive.

The package ships a **ready-made default cache**: import `CacheProvider` and `createCachedStore` directly — no instance to create. `createCachedStore(factory, { name })` returns a namespaced store group with `Provider`, the usual read hooks, plus `fromCache`, `useFromCache`, and `remove`. The `path` is inherited from `<CacheScope>`, so reusable components stay collision-free across mount locations.

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
usersTable.fromCache({ path: ['page-1'], id: 'users' })?.setState({ filter: 'archived' })
```

Need an isolated cache or a custom default `gcTime`? Build your own with `createStoreCache({ gcTime })` — same surface, as instance members (`cache.Provider`, `cache.Scope`, `cache.useCache`, `cache.useCacheKeys`, `cache.createCachedStore`).

→ [Full docs](docs/store-cache.md)

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

→ [Full docs](https://ez-kit.dev/docs/zu-store/with-history)

# @ez-kit/zu-store

Zustand utilities for React — context-scoped stores and ergonomic field bindings.

## Install

```bash
pnpm add @ez-kit/zu-store zustand
```

## API

### `createContextStore(factory)`

Wraps a Zustand store in React context. Returns `Provider`, `useStore`, `useShallowStore`, `useContextStore`, and `Item`. Multiple `Provider` instances are fully independent.

```tsx
const counterStore = createContextStore(({ count = 0 }: { count?: number }) =>
  createStore<{ count: number; increment: () => void }>()((set) => ({
    count,
    increment: () => set((s) => ({ count: s.count + 1 })),
  })),
)

<counterStore.Provider count={10}>
  <MyComponent />
</counterStore.Provider>

// inside MyComponent:
const count = counterStore.useStore((s) => s.count)
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

### `createStoreCache(options?)`

Keeps `createContextStore`-style stores alive across `Provider` unmount/remount, keyed by `(path, name, id)`, in memory (no `localStorage`). Useful for preserving table filters, pagination, etc. between page navigations. Returns `{ Provider, Scope, useCache, defineStore }`; `defineStore(factory)` returns a namespaced store group with `Provider`, the usual read hooks, plus `fromCache`, `useFromCache`, and `remove`. The `path` is inherited from `<cache.Scope>`, so reusable components stay collision-free across mount locations. `createContextStore` is left untouched — this is a separate, opt-in primitive.

```tsx
import { createStoreCache } from '@ez-kit/zu-store'
import { createStore } from 'zustand/vanilla'

const cache = createStoreCache({ gcTime: 5 * 60_000 })
const usersTable = cache.defineStore('users', (defaultProps: { filter?: string }) =>
  createStore<{ filter: string }>(() => ({ filter: defaultProps.filter ?? 'all' })),
)

// once, high in the tree
<cache.Provider>
  {/* survives unmount; reused on remount within gcTime */}
  {/* <Scope> namespaces by location so two pages never collide on the same id */}
  <cache.Scope path={['page-1']}>
    <usersTable.Provider id="users" defaultProps={{ filter: 'active' }}>
      <UsersTable />
    </usersTable.Provider>
  </cache.Scope>
</cache.Provider>

// imperatively, from anywhere — address the absolute { path, id }
usersTable.fromCache({ path: ['page-1'], id: 'users' })?.setState({ filter: 'archived' })
```

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

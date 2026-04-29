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

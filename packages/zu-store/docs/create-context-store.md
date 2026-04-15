# createContextStore

Wraps a Zustand vanilla store in React context. Returns a `Provider`, hooks, and a render-prop `Item` component so multiple independent instances of the same store can coexist in a tree.

## Signature

```ts
function createContextStore<TStore, TInitProps>(
  factory: (initProps: TInitProps) => TStore,
): {
  Provider: (props: PropsWithChildren<TInitProps>) => ReactElement
  useContextStore: () => TStore
  useStore: <T>(selector: (state: ExtractState<TStore>) => T) => T
  useShallowStore: <T>(selector: (state: ExtractState<TStore>) => T) => T
  Item: <T>(props: { selector: ..., children: (value: T) => ReactElement }) => ReactElement
}
```

## Basic Usage

```tsx
import { createContextStore } from '@ez-kit/zu-store'
import { createStore } from 'zustand'

interface CounterState {
  count: number
  increment: () => void
}

const counterStore = createContextStore(({ count = 0 }: { count?: number }) =>
  createStore<CounterState>()((set) => ({
    count,
    increment: () => set((s) => ({ count: s.count + 1 })),
  })),
)

// Wrap a subtree
function App() {
  return (
    <counterStore.Provider count={10}>
      <Counter />
    </counterStore.Provider>
  )
}

// Consume inside the tree
function Counter() {
  const count = counterStore.useStore((s) => s.count)
  const increment = counterStore.useStore((s) => s.increment)
  return <button onClick={increment}>{count}</button>
}
```

## API

### `Provider`

Initialises the store once (via `useRef`) and provides it to the tree. Accepts the same props as `TInitProps`.

### `useStore(selector)`

Subscribes to a slice of state. Re-renders only when the selected value changes.

### `useShallowStore(selector)`

Same as `useStore` but uses shallow equality — useful when the selector returns an object.

```tsx
const { count, label } = counterStore.useShallowStore((s) => ({
  count: s.count,
  label: s.label,
}))
```

### `useContextStore()`

Returns the raw `StoreApi` instance. Use when you need full store access (e.g. to call `getState()` outside of render).

### `Item`

Render-prop alternative to `useStore`. Useful in JSX-heavy code or when the consuming component should stay unaware of the store.

```tsx
<counterStore.Item selector={(s) => s.count}>
  {(count) => <span>{count}</span>}
</counterStore.Item>
```

## Multiple Independent Instances

Each `Provider` creates its own store instance — state is not shared between them.

```tsx
<counterStore.Provider count={1}>
  <Counter /> {/* sees count = 1 */}
</counterStore.Provider>

<counterStore.Provider count={99}>
  <Counter /> {/* sees count = 99 */}
</counterStore.Provider>
```

## Error Handling

Using any hook outside a `Provider` throws:

```
Missing Provider for createContextStore
```

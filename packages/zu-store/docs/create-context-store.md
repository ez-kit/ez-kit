# createContextStore

Wraps a Zustand vanilla store in React context. Returns a `Provider`, hooks, and a render-prop `Item` component so multiple independent instances of the same store can coexist in a tree.

## Install

```bash
pnpm add @ez-kit/zu-store zustand
```

## Signature

```ts
type ContextStoreInit<TDefaultValue> = { defaultValue: TDefaultValue }

function createContextStore<TStore, TDefaultValue = undefined>(
  factory: (init: ContextStoreInit<TDefaultValue>) => TStore,
): {
  Provider: (props: PropsWithChildren<{ defaultValue: TDefaultValue }>) => ReactElement
  useStore: () => TStore
  useSelector: <T>(selector: (state: ExtractState<TStore>) => T) => T
  useShallowSelector: <T>(selector: (state: ExtractState<TStore>) => T) => T
  Item: <T>(props: { selector: ..., children: (value: T) => ReactElement }) => ReactElement
}
```

The factory is seeded through a single `defaultValue` envelope; type its parameter with the exported `ContextStoreInit<T>` helper. `defaultValue` is required on the `Provider` when the seed has required fields, optional otherwise.

## Basic Usage

```tsx
import { type ContextStoreInit, createContextStore } from '@ez-kit/zu-store'
import { createStore } from 'zustand'

interface CounterState {
	count: number
	increment: () => void
}

const counterStore = createContextStore(({ defaultValue }: ContextStoreInit<{ count?: number }>) =>
	createStore<CounterState>()((set) => ({
		count: defaultValue.count ?? 0,
		increment: () => set((s) => ({ count: s.count + 1 })),
	})),
)

// Wrap a subtree
function App() {
	return (
		<counterStore.Provider defaultValue={{ count: 10 }}>
			<Counter />
		</counterStore.Provider>
	)
}

// Consume inside the tree
function Counter() {
	const count = counterStore.useSelector((s) => s.count)
	const increment = counterStore.useSelector((s) => s.increment)
	return <button onClick={increment}>{count}</button>
}
```

## API

### `Provider`

Initialises the store once (via `useRef`) and provides it to the tree. Pass the seed through the single `defaultValue` prop.

### `useSelector(selector)`

Subscribes to a slice of state. Re-renders only when the selected value changes.

### `useShallowSelector(selector)`

Same as `useSelector` but uses shallow equality — useful when the selector returns an object.

```tsx
const { count, label } = counterStore.useShallowSelector((s) => ({
	count: s.count,
	label: s.label,
}))
```

### `useStore()`

Returns the raw `StoreApi` instance without subscribing the caller. Use when you need full store access (e.g. to call `getState()` outside of render).

### `Item`

Render-prop alternative to `useSelector`. Useful in JSX-heavy code or when the consuming component should stay unaware of the store.

```tsx
<counterStore.Item selector={(s) => s.count}>{(count) => <span>{count}</span>}</counterStore.Item>
```

## Multiple Independent Instances

Each `Provider` creates its own store instance — state is not shared between them.

```tsx
<counterStore.Provider defaultValue={{ count: 1 }}>
  <Counter /> {/* sees count = 1 */}
</counterStore.Provider>

<counterStore.Provider defaultValue={{ count: 99 }}>
  <Counter /> {/* sees count = 99 */}
</counterStore.Provider>
```

## Error Handling

Using any hook outside a `Provider` throws:

```
Missing Provider for createContextStore
```

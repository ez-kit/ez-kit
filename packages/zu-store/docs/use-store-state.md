# useStoreState

A standalone hook that binds a single field of a Zustand store to a `[value, setValue]` tuple — exactly like `useState`, but backed by a store.

Works with any `StoreApi` instance, not just stores created by `createContextStore`.

## Signature

```ts
function useStoreState<TState, K extends keyof TState>(
	store: StoreApi<TState>,
	key: K,
): [TState[K], (value: TState[K]) => void]
```

## Basic Usage

```tsx
import { useStoreState } from '@ez-kit/zu-store'
import { createStore } from 'zustand'

interface FormState {
	name: string
	age: number
}

const formStore = createStore<FormState>()(() => ({ name: '', age: 0 }))

function NameField() {
	const [name, setName] = useStoreState(formStore, 'name')
	return (
		<input
			value={name}
			onChange={(e) => setName(e.target.value)}
		/>
	)
}
```

## Behaviour

- **Reads** the current value of `state[key]` and subscribes to changes.
- **Re-renders only** when the value at `key` changes — other field changes are ignored.
- **setValue** merges `{ [key]: newValue }` into the store via `store.setState`, leaving all other fields untouched.

## With createContextStore

Combine with `useContextStore()` to bind a context-provided store:

```tsx
const counterStore = createContextStore(...)

function CountInput() {
  const store = counterStore.useContextStore()
  const [count, setCount] = useStoreState(store, 'count')
  return <input type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} />
}
```

## Type Safety

The return type is inferred from the key:

```ts
const [count, setCount] = useStoreState(store, 'count')
// count: number
// setCount: (value: number) => void

const [name, setName] = useStoreState(store, 'name')
// name: string
// setName: (value: string) => void
```

Passing an unknown key is a compile-time error.

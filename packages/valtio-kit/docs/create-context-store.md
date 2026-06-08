# createContextStore

Wraps a [Valtio](https://github.com/pmndrs/valtio) proxy in React context. Returns a `Provider`, hooks, and a render-prop `Item` component so multiple independent instances of the same state can coexist in a tree.

Valtio already optimises re-renders per accessed property, so — unlike `@ez-kit/zu-store`'s `createContextStore` — there are **no selectors**. You mutate the proxy directly and read from snapshots.

## Install

```bash
pnpm add @ez-kit/valtio-kit valtio
```

## Signature

```ts
function createContextStore<TState, TInitProps>(
  factory: (initProps: TInitProps) => TState,
): {
  Provider: (props: PropsWithChildren<TInitProps>) => ReactElement
  useStore: () => TState
  useSnapshot: (options?: { sync?: boolean }) => Snapshot<TState>
  Item: (props: { children: (snapshot: Snapshot<TState>) => ReactElement }) => ReactElement
}
```

## Basic Usage

```tsx
import { createContextStore } from '@ez-kit/valtio-kit'
import { proxy } from 'valtio'

interface CounterState {
	count: number
}

const counter = createContextStore(({ count = 0 }: { count?: number }) => proxy<CounterState>({ count }))

// Wrap a subtree
function App() {
	return (
		<counter.Provider count={10}>
			<Counter />
		</counter.Provider>
	)
}

// Consume inside the tree
function Counter() {
	const snap = counter.useSnapshot() // read
	const state = counter.useStore() // write
	return <button onClick={() => (state.count += 1)}>{snap.count}</button>
}
```

> **Rule of thumb:** read from snapshots (`useSnapshot`), mutate the source proxy (`useStore`).

## API

### `Provider`

Initialises the proxy once (via `useRef`) and provides it to the tree. Accepts the same props as `TInitProps`, which are forwarded to the factory.

### `useStore()`

Returns the raw, **mutable** Valtio proxy. Mutate it directly to update state:

```tsx
const state = counter.useStore()
state.count += 1
state.label = 'changed'
```

> Note: this differs from `@ez-kit/zu-store`, where `useStore(selector)` returns a selected slice. Here `useStore()` is the write path — the proxy itself. Use it in event handlers and effects, not during render.

You can also pass it to Valtio vanilla utilities:

```tsx
import { subscribe } from 'valtio'

const state = counter.useStore()
useEffect(() => subscribe(state, () => console.log('changed')), [state])
```

### `useSnapshot(options?)`

Returns Valtio's readonly snapshot. Re-renders only when the properties you actually access change. Forwards Valtio's options (`{ sync }`) to the underlying `useSnapshot`:

```tsx
const snap = counter.useSnapshot({ sync: true })
```

### `Item`

Render-prop alternative to `useSnapshot`. Useful in JSX-heavy code or when the consuming component should stay unaware of the store.

```tsx
<counter.Item>{(snap) => <span>{snap.count}</span>}</counter.Item>
```

## Multiple Independent Instances

Each `Provider` creates its own proxy instance — state is not shared between them.

```tsx
<counter.Provider count={1}>
  <Counter /> {/* sees count = 1 */}
</counter.Provider>

<counter.Provider count={99}>
  <Counter /> {/* sees count = 99 */}
</counter.Provider>
```

## Error Handling

Using any hook outside a `Provider` throws:

```
Missing Provider for createContextStore
```

## Lint note (React Compiler)

`useStore()` returns a mutable proxy, and mutating it (`state.count += 1`) is the intended write path. The React Compiler ESLint ruleset (`react-hooks/immutability`) flags mutation of any value returned from a hook, so it will warn on this idiom. If you use that ruleset, disable the rule at the mutation site:

```tsx
const state = counter.useStore()
// eslint-disable-next-line react-hooks/immutability
state.count += 1
```

Prefer concentrating mutations in small action helpers to keep the disables localised.

# @ez-kit/valtio-kit

Valtio utilities for React — context-scoped proxies with Provider isolation.

## Install

```bash
pnpm add @ez-kit/valtio-kit valtio
```

## API

### `createContextStore(factory)`

Wraps a Valtio proxy in React context. Returns `Provider`, `useStore`, `useSnapshot`, and `Item`. Multiple `Provider` instances are fully independent.

Unlike `@ez-kit/zu-store`, there are no selectors — Valtio tracks accessed properties automatically. Read from `useSnapshot()`, mutate the proxy from `useStore()`.

```tsx
import { type ContextStoreInit, createContextStore } from '@ez-kit/valtio-kit'
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

→ [Full docs](docs/create-context-store.md)

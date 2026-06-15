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

### Search params sync

Two-way sync between a Valtio store and the URL search params. The proxy stays the synchronous source of truth; the URL is a throttled, rehydratable mirror. Type-safe parsers, pluggable layouts (`flat`/`json`/`qs`), `push`/`replace` history control, and react-router + Next adapters — with an SSR-correct, request-scoped form.

```tsx
import {
  createFieldsStore,
  paramString,
  paramNumber,
  StoreSearchParamsProvider,
} from '@ez-kit/valtio-kit/search-params'
import { reactRouterAdapter } from '@ez-kit/valtio-kit/search-params/routers/react-router'
import { proxy } from 'valtio'

const filters = createFieldsStore(
  () => proxy({ q: '', page: 1 }),
  (field) => [field((s) => s.q, paramString()), field((s) => s.page, paramNumber())],
)

<StoreSearchParamsProvider adapter={reactRouterAdapter}>
  <filters.Provider>
    <Filters />
  </filters.Provider>
</StoreSearchParamsProvider>
```

For class-based stores using `@searchParam` decorators, use `createSearchParamsStore(factory, options?)` instead — it discovers the decorated fields automatically.

Subpaths (optional peers, install only what you use):

| Import                                                  | Peer              |
| ------------------------------------------------------- | ----------------- |
| `@ez-kit/valtio-kit/search-params`                      | — (zero-dep core) |
| `@ez-kit/valtio-kit/search-params/routers/react-router` | `react-router`    |
| `@ez-kit/valtio-kit/search-params/routers/next`         | `next`            |
| `@ez-kit/valtio-kit/search-params/validators/zod`       | `zod`             |
| `@ez-kit/valtio-kit/search-params/encoders/qs`          | `qs`              |

→ [Full docs](docs/search-params.md)

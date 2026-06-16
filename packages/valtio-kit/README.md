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

### Persist

Mirror a Valtio store into an external substrate — the URL, `localStorage`/`sessionStorage`, IndexedDB, or your own — and back, in both directions. The proxy stays the **synchronous** source of truth; the substrate is a throttled, rehydratable projection of it.

One source-agnostic engine drives every substrate. Its only interchange language is `Keyed = Map<string, string>`; a **source adapter** teaches the engine how to read and write one substrate through a tiny port (`get` / `set` / optional `subscribe`). Codecs, key naming, throttling, loop-breaking, and hydration are shared, so a single field can sync to two substrates at once and async sources (IndexedDB) never stall the synchronous URL.

```tsx
import { createPersistStore, PersistProvider } from '@ez-kit/valtio-kit/persist'
import { persistUrl } from '@ez-kit/valtio-kit/persist/url'
import { reactRouterAdapter } from '@ez-kit/valtio-kit/persist/url/react-router'
import { persistLocalStorage, localStorageAdapter } from '@ez-kit/valtio-kit/persist/storage'
import { proxy } from 'valtio'

// Decorate the fields to sync. Primitives need no parser — it's auto-resolved.
class Filters {
  @persistUrl() q = '' // → ?q=…
  @persistLocalStorage() density = 'comfortable' // → localStorage
}

// Request-scoped, SSR-correct. Omit the fields list → decorators are discovered.
const filtersStore = createPersistStore(() => proxy(new Filters()))

function Page() {
  return (
    <PersistProvider adapters={[reactRouterAdapter, localStorageAdapter()]}>
      <filtersStore.Provider>
        <Filters />
      </filtersStore.Provider>
    </PersistProvider>
  )
}
```

Read with `useSnapshot()`, write through the raw proxy from `useStore()`. Storage adapters are inert on the server; gate on `filtersStore.useHydrated()` when the post-hydration fill would cause a flash. Can't use build-time decorators? `createPersistFields(factory, (field) => [field((s) => s.q, urlField())])` is the equivalent accessor front.

Subpaths (optional peers, install only what you use):

| Import                                          | Peer              |
| ----------------------------------------------- | ----------------- |
| `@ez-kit/valtio-kit/persist`                    | — (zero-dep core) |
| `@ez-kit/valtio-kit/persist/url`                | — (zero-dep core) |
| `@ez-kit/valtio-kit/persist/storage`            | — (zero-dep core) |
| `@ez-kit/valtio-kit/persist/url/react-router`   | `react-router`    |
| `@ez-kit/valtio-kit/persist/url/next`           | `next`            |
| `@ez-kit/valtio-kit/persist/validators/zod`     | `zod`             |

→ [Full docs](https://github.com/ez-kit/ez-kit/tree/main/apps/docs/content/docs/valtio-kit/persist)

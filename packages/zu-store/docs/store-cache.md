# createStoreCache

Keeps `createContextStore`-style stores **alive across `Provider` unmount/remount**, keyed by an identity, entirely in memory (no `localStorage`). Use it to preserve table filters, pagination, scroll position, etc. when navigating between pages — and to reach a live store imperatively from anywhere.

`createContextStore` is unchanged and remains the primitive for stores that should die with their `Provider`. `createStoreCache` is a separate, opt-in primitive for the keep-alive case.

## Install

```bash
pnpm add @ez-kit/zu-store zustand
```

## Signature

```ts
function createStoreCache(options?: { gcTime?: number }): {
	Provider: (props: PropsWithChildren) => ReactElement
	useCache: () => { keys: () => Map<string, string[]>; clear: () => void }
	defineStore: <TStore, TDefaultProps>(
		name: string,
		factory: (defaultProps: TDefaultProps) => TStore,
		options?: { gcTime?: number },
	) => CachedStoreGroup<TStore, TDefaultProps>
}
```

A store-group handle from `defineStore` exposes:

```ts
{
	Provider // keyed observer: cacheKey + defaultProps (+ gcTime / alwaysCache)
	useStore // \
	useShallowStore //  } same semantics as createContextStore, under the store-group Provider
	useContextStore //  }
	Item // /
	fromCache(key) // imperative get-if-alive → StoreApi | undefined (never creates)
	useFromCache(key, sel) // reactive, passive cross-tree read
	remove(key) // remove this group's entry
}
```

## Basic Usage

```tsx
import { createStoreCache } from '@ez-kit/zu-store'
import { createStore } from 'zustand'

interface TableState {
	filter: string
	page: number
	setFilter: (filter: string) => void
}

// 1. Create the cache system (one per app / scope).
const cache = createStoreCache({ gcTime: 5 * 60_000 })

// 2. Define a store group against it (the name is its inspectable namespace).
const usersTable = cache.defineStore('users', (defaultProps: { filter?: string }) =>
	createStore<TableState>((set) => ({
		filter: defaultProps.filter ?? 'all',
		page: 1,
		setFilter: (filter) => set({ filter }),
	})),
)

// 3. Mount the cache boundary once, high in the tree.
function Root() {
	return (
		<cache.Provider>
			<App />
		</cache.Provider>
	)
}

// 4. Mount the keyed Provider where the table lives. It survives unmount.
function UsersPage() {
	return (
		<usersTable.Provider
			cacheKey='users'
			defaultProps={{ filter: 'active' }}
		>
			<UsersTable />
		</usersTable.Provider>
	)
}

// 5. Read like a normal context store.
function UsersTable() {
	const filter = usersTable.useStore((s) => s.filter)
	return <span>{filter}</span>
}
```

Navigate away from `UsersPage` and back within `gcTime`: the store instance — and its `filter`/`page` — is reused. `defaultProps` only seeds the **first** creation of a key; on reuse it is ignored.

## API

### `cache.Provider`

Owns the real cache storage, created per React tree (so SSR renders and tests are isolated by construction). Mount it once above the store-group `Provider`s. Unmounting it drops the whole scope. Using a store-group hook/provider without a `cache.Provider` ancestor throws `Missing StoreCacheProvider for createStoreCache`.

### Store-group `Provider`

| Prop           |          | Description                                                                                     |
| -------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `cacheKey`     | required | Identity of the entry within the store group.                                                   |
| `defaultProps` | optional | Seed passed to the factory **only** when the key is first created.                              |
| `gcTime`       | optional | Eviction delay (ms) once observers reach 0. Birth-config — fixed by the first mount of the key. |
| `alwaysCache`  | optional | Pin the entry against automatic eviction (≡ `gcTime: Infinity`).                                |

Multiple `Provider`s with the same `cacheKey` share one store (live-sync). The `Provider` is the unit of reference counting.

### `fromCache(key)`

Imperative, returns the live `StoreApi` or `undefined`. Never creates an entry and never affects lifecycle. Use it in event handlers, actions, or non-React code:

```ts
usersTable.fromCache('users')?.setState({ page: 2 })
```

### `useFromCache(key, selector)`

Reactively reads a cached store from anywhere — even outside the store-group `Provider`. The selector receives the state or `undefined` when no entry exists. It is **passive**: it reflects the cache but does not keep the store alive.

```tsx
const activeFilters = usersTable.useFromCache('users', (s) => s?.filters.length ?? 0)
```

### `remove(key)` / `useCache().clear()`

`remove` deletes one entry; `clear` (from `useCache`) removes every entry in the active cache. Both override `alwaysCache`.

## Lifecycle

- The `Provider` (and only the `Provider`) reference-counts an entry.
- When observers reach 0, the entry is evicted after `gcTime`; remounting before then keeps it.
- `alwaysCache` / `gcTime: Infinity` pins an entry; manual `remove`/`clear` still removes it.

## Gotchas

- **`defineStore` names must be unique within a cache.** The `name` is the group's namespace and shows up in `useCache().keys()`; two groups sharing a name under the same `cache.Provider` would collide on one keyspace.
- **`alwaysCache` + dynamic keys leaks.** Pinned entries with unbounded keys (`order-${id}`) never evict. Use `alwaysCache` only for a small, fixed set of keys; rely on `gcTime` for dynamic ones.
- **`useFromCache` is passive.** After the owning `Provider` unmounts and `gcTime` elapses, the store is evicted and the reader sees `undefined`. Use `alwaysCache`/`gcTime` if a reader must keep it alive.
- **Imperative access needs a mounted `cache.Provider`.** `fromCache`/`remove` target the active client cache; with multiple `cache.Provider`s, prefer `useCache()` inside the tree.
- **Prefer the URL for "prepare then navigate".** To open a page with pre-set state, carry intent in the URL/route and seed via `defaultProps` rather than setting a cold store before it mounts.
- **Client-only.** On the server the store-group `Provider` is ephemeral (seeded per request) and `fromCache` returns `undefined`.

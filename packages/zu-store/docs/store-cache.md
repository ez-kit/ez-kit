# createStoreCache

Keeps `createContextStore`-style stores **alive across `Provider` unmount/remount**, keyed by an identity, entirely in memory (no `localStorage`). Use it to preserve table filters, pagination, scroll position, etc. when navigating between pages — and to reach a live store imperatively from anywhere.

`createContextStore` is unchanged and remains the primitive for stores that should die with their `Provider`. `createCachedStore` is a separate, opt-in primitive for the keep-alive case.

The package ships a **ready-made default cache** — import `CacheProvider`, `CacheScope`, `useCache`, `useCacheKeys`, and `createCachedStore` directly, with no instance to create. Build your own with `createStoreCache` only when you need an isolated cache or a custom default `gcTime`; it returns the same surface as instance members.

## Install

```bash
pnpm add @ez-kit/zu-store zustand
```

## Signature

```ts
type CacheRecord = { path: string[]; name: string; id: string }

function createStoreCache(options?: { gcTime?: number }): {
	Provider: (props: PropsWithChildren) => ReactElement
	Scope: (props: { path: string[]; children: ReactNode }) => ReactElement
	useCache: () => {
		keys: (prefix?: string[]) => CacheRecord[]           // non-reactive snapshot
		clear: (prefix?: string[]) => void                   // optional subtree clear
	}
	useCacheKeys: (prefix?: string[]) => CacheRecord[]          // reactive: re-renders on membership change
	createCachedStore: <TStore, TDefaultValue>(
		factory: (init: ContextStoreInit<TDefaultValue>) => TStore,
		options: { name: string; gcTime?: number },
	) => CachedStoreGroup<TStore, TDefaultValue>
}

// Default cache, exported at the top level (one ready-made instance):
//   CacheProvider, CacheScope, useCache, useCacheKeys, createCachedStore

// Pure utility, exported from the same module:
function toTree(records: CacheRecord[]): CacheTree
```

A store-group handle from `createCachedStore` exposes:

```ts
{
	Provider // keyed observer: id + path? + defaultValue (+ gcTime / alwaysCache)
	useStore // \
	useShallowStore //  } same semantics as createContextStore, under the store-group Provider
	useContextStore //  }
	Item // /
	fromCache({ path?, id }) // imperative get-if-alive → StoreApi | undefined (never creates)
	useFromCache({ path?, id }, sel) // reactive, passive cross-tree read
	remove({ path?, id }) // remove this group's entry
}
```

## Namespacing with `Scope`

Entry identity is `(path, name, id)`. The `path` is inherited from the enclosing `<cache.Scope path={[...]}>` (nested scopes concatenate, outermost first); the optional `path` prop on a `Provider` is appended after it. This lets a reusable component set only its `id` and still be namespaced by where it is mounted — two mounts of the same `(name, id)` under different scopes never collide. With no `Scope`, the path is `[]` (root).

```tsx
function UserTable({ userId }: { userId: string }) {
	// knows only its own id, nothing about the page it sits on
	return (
		<usersTable.Provider id={`user-${userId}`}>
			<Grid />
		</usersTable.Provider>
	)
}

<CacheScope path={['page-1']}>
	<UserTable userId='42' /> {/* identity: (['page-1'], 'users', 'user-42') */}
</CacheScope>
<CacheScope path={['page-2']}>
	<UserTable userId='42' /> {/* identity: (['page-2'], 'users', 'user-42') — independent */}
</CacheScope>
```

## Basic Usage

```tsx
import { CacheProvider, createCachedStore } from '@ez-kit/zu-store'
import { createStore } from 'zustand'

interface TableState {
	filter: string
	page: number
	setFilter: (filter: string) => void
}

// 1. Define a store group against the default cache (the name is its inspectable namespace).
const usersTable = createCachedStore(
	({ defaultValue }: ContextStoreInit<{ filter?: string }>) =>
		createStore<TableState>((set) => ({
			filter: defaultValue.filter ?? 'all',
			page: 1,
			setFilter: (filter) => set({ filter }),
		})),
	{ name: 'users' },
)

// 2. Mount the cache boundary once, high in the tree.
function Root() {
	return (
		<CacheProvider>
			<App />
		</CacheProvider>
	)
}

// 3. Mount the keyed Provider where the table lives. It survives unmount.
function UsersPage() {
	return (
		<usersTable.Provider
			id='users'
			defaultValue={{ filter: 'active' }}
		>
			<UsersTable />
		</usersTable.Provider>
	)
}

// 4. Read like a normal context store.
function UsersTable() {
	const filter = usersTable.useStore((s) => s.filter)
	return <span>{filter}</span>
}
```

Navigate away from `UsersPage` and back within `gcTime`: the store instance — and its `filter`/`page` — is reused. `defaultValue` only seeds the **first** creation of a key; on reuse it is ignored.

## API

### `cache.Provider`

Owns the real cache storage, created per React tree (so SSR renders and tests are isolated by construction). Mount it once above the store-group `Provider`s. Unmounting it drops the whole scope. Using a store-group hook/provider without a `cache.Provider` ancestor throws `Missing StoreCacheProvider for createStoreCache`.

### Store-group `Provider`

| Prop           |          | Description                                                                                     |
| -------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `id`     | required | Identity of the entry within the store group.                                                   |
| `defaultValue` | optional | Seed passed to the factory **only** when the key is first created.                              |
| `gcTime`       | optional | Eviction delay (ms) once observers reach 0. Birth-config — fixed by the first mount of the key. |
| `alwaysCache`  | optional | Pin the entry against automatic eviction (≡ `gcTime: Infinity`).                                |

Multiple `Provider`s with the same `id` share one store (live-sync). The `Provider` is the unit of reference counting.

Reads address the **absolute** `{ path, id }` (`path` defaults to `[]` root). Writes inherit their path from `Scope`; reads state it explicitly.

### `fromCache({ path, id })`

Imperative, returns the live `StoreApi` or `undefined`. Never creates an entry and never affects lifecycle. Use it in event handlers, actions, or non-React code:

```ts
usersTable.fromCache({ path: ['page-1'], id: 'users' })?.setState({ page: 2 })
```

### `useFromCache({ path, id }, selector)`

Reactively reads a cached store from anywhere — even outside the store-group `Provider`. The selector receives the state or `undefined` when no entry exists. It is **passive**: it reflects the cache but does not keep the store alive.

```tsx
const activeFilters = usersTable.useFromCache({ path: ['page-1'], id: 'users' }, (s) => s?.filters.length ?? 0)
```

### `remove({ path, id })` / `useCache().clear(prefix?)`

`remove` deletes one entry. `clear()` removes every entry in the active cache; `clear(prefix)` removes every entry whose path is prefixed by `prefix`, across all groups (the "leave a page, drop its stores" lever). All override `alwaysCache`.

### `useCache().keys(prefix?)`

Returns a flat `CacheRecord[]` of live entries — `{ path, name, id }` per entry. Non-reactive snapshot, assertion- and iteration-friendly. Pass an optional path `prefix` to scope the result to a subtree.

### `cache.useCacheKeys(prefix?)` — reactive hook

Live equivalent of `useCache().keys()`, exposed at the top level of the cache bundle. Re-renders only when the cache **membership** changes (entries added or removed); internal state changes inside individual entries do not trigger it, so devtools panels and badges built on `useCacheKeys` stay cheap.

```tsx
function CacheBadge() {
	const records = cache.useCacheKeys()
	return <span>{records.length} cached</span>
}
```

### `toTree(records)` — standalone utility

Pure function exported alongside `createStoreCache`. Takes any coordinate list and returns a nested object view (log- and devtools-friendly). Compose with `useCache().keys()` for a one-off snapshot or with `cache.useCacheKeys()` for a reactive nested view:

```tsx
import { toTree } from '@ez-kit/zu-store'

// one-off snapshot
const tree = toTree(cache.useCache().keys())
const subtree = toTree(cache.useCache().keys(['page-1']))

// reactive (inside a component)
function CachePanel({ customerId }: { customerId: string }) {
	const tree = toTree(cache.useCacheKeys(['customer', customerId]))
	return <pre>{JSON.stringify(tree, null, 2)}</pre>
}
```

## Lifecycle

- The `Provider` (and only the `Provider`) reference-counts an entry.
- When observers reach 0, the entry is evicted after `gcTime`; remounting before then keeps it.
- `alwaysCache` / `gcTime: Infinity` pins an entry; manual `remove`/`clear` still removes it.

## Gotchas

- **`createCachedStore` names must be unique within a cache.** The `name` is the group's namespace and shows up in `useCache().keys()`; two groups sharing a name under the same `CacheProvider` would collide on one keyspace. In development, the library emits a `console.warn` on the second call — a frequent symptom of calling `createCachedStore` inside a render.
- **Don't mount two `<cache.Provider>` for the same cache.** Imperative access via `fromCache`/`remove` targets the most recently activated cache and is ambiguous when both are mounted. In development, the library emits a `console.warn` when this happens.
- **`alwaysCache` + dynamic keys or paths leaks.** Pinned entries under unbounded keys (`order-${id}`) or paths never evict. Use `alwaysCache` only for a small, fixed set; rely on `gcTime` for dynamic ones, and `clear(path)` to drop a subtree on navigation.
- **Reads use the absolute path.** `fromCache`/`useFromCache`/`remove` take `{ path, id }` and default `path` to `[]`. A read with the wrong path silently misses.
- **`useFromCache` is passive.** After the owning `Provider` unmounts and `gcTime` elapses, the store is evicted and the reader sees `undefined`. Use `alwaysCache`/`gcTime` if a reader must keep it alive.
- **Imperative access needs a mounted `cache.Provider`.** `fromCache`/`remove` target the active client cache; with multiple `cache.Provider`s, prefer `useCache()` inside the tree.
- **Prefer the URL for "prepare then navigate".** To open a page with pre-set state, carry intent in the URL/route and seed via `defaultValue` rather than setting a cold store before it mounts.
- **Client-only.** On the server the store-group `Provider` is ephemeral (seeded per request) and `fromCache` returns `undefined`.

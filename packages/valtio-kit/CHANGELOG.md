# @ez-kit/valtio-kit

## 0.1.0

### Minor Changes

- 492e42a: **BREAKING:** `createContextStore` is now seeded through a single `defaultValue` envelope instead of spread init props.
  - The factory receives `{ defaultValue }` (type it with the new exported `ContextStoreInit<T>` helper) instead of a flat init object.
  - The `Provider` takes one `defaultValue` prop (required when the seed has required fields, optional otherwise) instead of loose props.

    ```diff
    - const counter = createContextStore((initProps: CounterInit) => …)
    + const counter = createContextStore(({ defaultValue }: ContextStoreInit<CounterInit>) => …)

    - <counter.Provider count={3} label="x">
    + <counter.Provider defaultValue={{ count: 3, label: 'x' }}>
    ```

  **`@ez-kit/valtio-kit` only — BREAKING:** the `Item` render-prop child now receives `{ snap, store }` (read via `snap`, write via the raw `store` proxy) instead of just `snap`.

  ```diff
  - <counter.Item>{(snap) => <span>{snap.count}</span>}</counter.Item>
  + <counter.Item>{({ snap, store }) => <span>{snap.count}</span>}</counter.Item>
  ```

  **`@ez-kit/zu-store` `createCachedStore` (store-cache) — BREAKING:** the Provider's `defaultProps` prop and `TDefaultProps` generic are renamed to `defaultValue` / `TDefaultValue`, and the factory now receives the same `{ defaultValue }` envelope, matching `createContextStore`.

  ```diff
  - createCachedStore((defaultProps: { filter?: string }) => …, { name: 'users' })
  + createCachedStore(({ defaultValue }: ContextStoreInit<{ filter?: string }>) => …, { name: 'users' })

  - <usersTable.Provider id="users" defaultProps={{ filter: 'active' }} />
  + <usersTable.Provider id="users" defaultValue={{ filter: 'active' }} />
  ```

- 2d36563: Add `@ez-kit/store-core` (shared cache + plugin core), give `@ez-kit/valtio-kit` a store cache, and turn persist into a plugin.

  **New package `@ez-kit/store-core`** — a published, manager-agnostic core consumed by both store packages, with subpath exports:
  - `.` — the plugin/service contracts: `StoreId`, `StorePlugin`/`PluginContext`/`PluginCleanup`, `ServiceRegistry` (`get`/`safeGet`), `serviceKey`, and a React `ServicesProvider`/`useServices`.
  - `./cache` — a generic instance cache: `createInstanceCache` (`getOrCreate`/observers/`clear`) with a **create → reuse → clear** lifecycle that runs a per-instance `PluginCleanup` on clear, and `createCacheReact({ useRead })` (Provider/Scope/useCache/useCacheKeys/createCachedStore) parameterized by a single store-manager read primitive.
  - `./persist` — reserved for a future generic engine.

  **`@ez-kit/valtio-kit`**
  - New cache surface mirroring `@ez-kit/zu-store`: `createStoreCache`, `Scope`, `useCache`, `useCacheKeys`, `createCachedStore`, plus a default-cache surface. A cache-hit returns the **same live proxy**, so in-progress mutations survive unmount/remount within `gcTime`.
  - New plugin-capable base factory `createStore(factory, { plugins? })`; `createContextStore` is unchanged and now layered on top.
  - New app-level `StoreProvider({ persist?, cache? })` that mounts one persist engine per source and publishes them (plus the cache) as services for plugins to resolve.
  - **BREAKING:** persist is now a plugin. `createPersistStore` and `createPersistFields` are removed. Migrate `createPersistStore(factory)` → `createCachedStore(factory, { plugins: [persist()] })` (cached) or `createStore(factory, { plugins: [persist()] })` (non-cached); `createPersistFields(factory, fields)` → the same factory plus `persist({ fields })`. `@persistUrl`/`@persistLocalStorage`/accessor field declarations are unchanged and discovered by `persist()`. `PersistProvider` still mounts engines (now exposed via the `PERSIST_ENGINES` service); the hardened persist engine internals are unchanged.

  **`@ez-kit/zu-store`**
  - The store cache is re-platformed onto `@ez-kit/store-core/cache`; public API is unchanged.
  - `createCachedStore` now accepts an optional `plugins` array, bound to the cached instance's lifetime (setup on create, cleanup on eviction).

- 2d36563: Add a source-agnostic **persist** core (Valtio is the source of truth, the substrate is a mirror) and re-express URL search-params sync as an adapter on top of it. Replaces the previous `@ez-kit/valtio-kit/search-params` surface.
  - Source-agnostic engine speaking a single `Keyed = Map<string, string>` interchange: codecs run inside the core, so any adapter only ever sees pre-stringified values. The engine never imports React, `URLSearchParams`, or a storage API.
  - `SourcePort` (`get` / `set` / optional `subscribe`) is the one extension seam every adapter satisfies — synchronous (URL, storage) or async (`Promise`-returning) substrates.
  - Decorator + accessor fronts: base `persistField({ source, key?, parser?, meta? })`; `persistUrl()` / `urlField()` are thin URL wrappers. A field may carry one annotation per source (one binding/engine each).
  - Request-scoped, SSR-correct store factories: `createPersistStore(factory)` (decorator discovery) and `createPersistFields(factory, fields)` (accessor builder), seeded synchronously from the substrate.
  - `PersistProvider adapters` mounts a render-scoped source adapter; router adapters `reactRouterAdapter` / `nextAdapter` ship via `@ez-kit/valtio-kit/persist/url/react-router` and `.../persist/url/next`.
  - Key naming (`key` / `absolute` / `prefix`) moved onto the descriptor/core; the URL port is stateless and preserves foreign params.
  - Codecs unchanged (`paramString`, `paramNumber`, `paramBoolean`, `paramBigInt`, `paramDate`, `paramEnum`, `paramArray`, `paramJson`); `zodParam` via `@ez-kit/valtio-kit/persist/validators/zod`.

  **BREAKING (unreleased):** the `@ez-kit/valtio-kit/search-params` subpath, the `layout` strategy objects (`flat`/`json`/`nested`), and the `qs` encoder/peer are removed. `react-router`, `next`, and `zod` remain optional peers.

  New entrypoints: `@ez-kit/valtio-kit/persist`, `/persist/url`, `/persist/url/react-router`, `/persist/url/next`, `/persist/validators/zod`.

- 2d36563: Add cross-tab synchronization to the persist storage adapters.
  - The storage `SourcePort` now exposes `subscribe`: it listens for the browser `storage` event on its own key (and full-`clear()` events) and triggers a `pull`, so a change written in one tab propagates into every other tab's proxy. Events for other keys or a different storage area are ignored; `subscribe` is inert on the server.
  - The echo loop is broken by the engine's existing baseline rebase on `pull` (last-committed becomes the pulled value), so a tab that receives a cross-tab change does not write it back — no A→B→A bounce.

  Documented limitation: two proxies bound to the **same** storage key **within one tab** are unsupported (the same-tab writer receives no `storage` event). Use one bound proxy per key per tab.

- 2d36563: Add an asynchronous IndexedDB source to the persist core.
  - `@ez-kit/valtio-kit/persist/storage` now exports `indexedDbAdapter({ dbName?, storeName?, storageKey? })` (and `createIndexedDbPort`), an ambient adapter whose `get()`/`set()` return `Promise`. It stores the same `{ v, s }` blob shape as the Web Storage adapters (via shared pack/unpack), and is inert on the server (no `indexedDB`).
  - Writes go through a serialized write queue (`createWriteQueue`) with **last-write-wins**: while a write is in flight, only the most recent value is kept and superseded queued writes are dropped. A failed write resets the queue so later writes still run.
  - The engine already awaits `Promise`-returning `get()`/`set()`, so async sources never block synchronous (URL) ones. Async hydration obeys first-present-wins: a late IndexedDB read fills only fields still at their default and never clobbers a value the URL already set.
  - Field fronts for parity: `persistIndexedDb()` decorator and `indexedDbField()` accessor.

  New exports from `@ez-kit/valtio-kit/persist/storage`: `indexedDbAdapter`, `createIndexedDbPort`, `persistIndexedDb`, `indexedDbField`, `createWriteQueue`, `INDEXED_DB_SOURCE`, `DEFAULT_IDB_KEY`.

- 2d36563: Add storage schema versioning and migrations to the persist storage adapters.
  - The storage adapters (`localStorageAdapter`, `sessionStorageAdapter`, `indexedDbAdapter`) now accept `{ version?, migrate? }`. The blob already records its schema `version`; on `get()`, when the stored version is older than the configured current version, the adapter runs `migrate(storedKeyed, fromVersion) => Keyed` and rewrites the store at the current version.
  - Edge cases: a thrown `migrate` discards the stored data and hydrates defaults without throwing (the bad blob is still replaced); a missing/non-numeric version is treated as `v0`; data already at (or newer than) the current version passes through untouched.
  - The core stays version-agnostic — all versioning lives in the adapter / shared `blob` helper (`packBlob` / `readBlob` / `runMigration`), reused by both the Web Storage and IndexedDB adapters.

  New exports from `@ez-kit/valtio-kit/persist/storage`: the `Migrate` and `MigrationConfig` types (the `version`/`migrate` options are part of each adapter's options).

- 2d36563: Add first-party **storage** sources (`localStorage` / `sessionStorage`) to the persist core, plus multi-source coordination, hydration control, and per-source handles.
  - `@ez-kit/valtio-kit/persist/storage`: ambient `localStorageAdapter()` / `sessionStorageAdapter()` producing a `SourcePort`, plus `persistLocalStorage()` / `persistSessionStorage()` decorators and `localStorageField()` / `sessionStorageField()` accessor parity.
  - Single JSON blob per store (`{ v, s }`) under one key; default-valued fields are omitted (`clearOnDefault`). Every read/write is guarded — disabled storage (private mode, sandboxed iframe, SSR), quota-exceeded (warn once, never throw), and corrupt blobs (fall back to defaults, clear the key).
  - `PersistProvider` now takes `adapters={[...]}` (an array) — one engine per source — so a field can sync to the URL **and** storage at once (`@persistUrl()` + `@persistLocalStorage()`), each writing its own substrate. **BREAKING (unreleased):** the prop changed from singular `adapter` to `adapters`.
  - Hydration contract: first-present-wins on cold start (an explicit `?q=` URL beats a stale stored value), last-arrival-wins at runtime. Ambient (storage) sources are not seeded synchronously in render — they hydrate after mount — so SSR markup matches the first client render.
  - `store.useHydrated()` — `false` on the server and first client render, flipping to `true` once every source's first read has been applied; gate a skeleton or defer side-effects to avoid a flash/CLS.
  - Per-source control handles on a bound proxy: `$url` and `$persist` coexist without collision and are inert on the server.

  New entrypoint: `@ez-kit/valtio-kit/persist/storage`.

### Patch Changes

- Updated dependencies [2d36563]
  - @ez-kit/store-core@0.2.0

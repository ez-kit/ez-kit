---
'@ez-kit/valtio-kit': minor
---

Add first-party **storage** sources (`localStorage` / `sessionStorage`) to the persist core, plus multi-source coordination, hydration control, and per-source handles.

- `@ez-kit/valtio-kit/persist/storage`: ambient `localStorageAdapter()` / `sessionStorageAdapter()` producing a `SourcePort`, plus `persistLocalStorage()` / `persistSessionStorage()` decorators and `localStorageField()` / `sessionStorageField()` accessor parity.
- Single JSON blob per store (`{ v, s }`) under one key; default-valued fields are omitted (`clearOnDefault`). Every read/write is guarded — disabled storage (private mode, sandboxed iframe, SSR), quota-exceeded (warn once, never throw), and corrupt blobs (fall back to defaults, clear the key).
- `PersistProvider` now takes `adapters={[...]}` (an array) — one engine per source — so a field can sync to the URL **and** storage at once (`@persistUrl()` + `@persistLocalStorage()`), each writing its own substrate. **BREAKING (unreleased):** the prop changed from singular `adapter` to `adapters`.
- Hydration contract: first-present-wins on cold start (an explicit `?q=` URL beats a stale stored value), last-arrival-wins at runtime. Ambient (storage) sources are not seeded synchronously in render — they hydrate after mount — so SSR markup matches the first client render.
- `store.useHydrated()` — `false` on the server and first client render, flipping to `true` once every source's first read has been applied; gate a skeleton or defer side-effects to avoid a flash/CLS.
- Per-source control handles on a bound proxy: `$url` and `$persist` coexist without collision and are inert on the server.

New entrypoint: `@ez-kit/valtio-kit/persist/storage`.

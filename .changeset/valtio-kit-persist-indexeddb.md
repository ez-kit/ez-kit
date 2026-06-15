---
'@ez-kit/valtio-kit': minor
---

Add an asynchronous IndexedDB source to the persist core.

- `@ez-kit/valtio-kit/persist/storage` now exports `indexedDbAdapter({ dbName?, storeName?, storageKey? })` (and `createIndexedDbPort`), an ambient adapter whose `get()`/`set()` return `Promise`. It stores the same `{ v, s }` blob shape as the Web Storage adapters (via shared pack/unpack), and is inert on the server (no `indexedDB`).
- Writes go through a serialized write queue (`createWriteQueue`) with **last-write-wins**: while a write is in flight, only the most recent value is kept and superseded queued writes are dropped. A failed write resets the queue so later writes still run.
- The engine already awaits `Promise`-returning `get()`/`set()`, so async sources never block synchronous (URL) ones. Async hydration obeys first-present-wins: a late IndexedDB read fills only fields still at their default and never clobbers a value the URL already set.
- Field fronts for parity: `persistIndexedDb()` decorator and `indexedDbField()` accessor.

New exports from `@ez-kit/valtio-kit/persist/storage`: `indexedDbAdapter`, `createIndexedDbPort`, `persistIndexedDb`, `indexedDbField`, `createWriteQueue`, `INDEXED_DB_SOURCE`, `DEFAULT_IDB_KEY`.

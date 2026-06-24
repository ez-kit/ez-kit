---
'@ez-kit/valtio-kit': minor
---

Add storage schema versioning and migrations to the persist storage adapters.

- The storage adapters (`localStorageAdapter`, `sessionStorageAdapter`, `indexedDbAdapter`) now accept `{ version?, migrate? }`. The blob already records its schema `version`; on `get()`, when the stored version is older than the configured current version, the adapter runs `migrate(storedKeyed, fromVersion) => Keyed` and rewrites the store at the current version.
- Edge cases: a thrown `migrate` discards the stored data and hydrates defaults without throwing (the bad blob is still replaced); a missing/non-numeric version is treated as `v0`; data already at (or newer than) the current version passes through untouched.
- The core stays version-agnostic — all versioning lives in the adapter / shared `blob` helper (`packBlob` / `readBlob` / `runMigration`), reused by both the Web Storage and IndexedDB adapters.

New exports from `@ez-kit/valtio-kit/persist/storage`: the `Migrate` and `MigrationConfig` types (the `version`/`migrate` options are part of each adapter's options).

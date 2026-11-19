# Proposal

## Why

Dashboards and other composed UI components need to persist layouts under stable scopes,
restore from async sources before interaction, and reset settings for an entire scope.
The existing cache and persistence stack provide a foundation, but do not yet separate
addressing, record versions and concurrent operation ownership reliably enough for this use case.

## What Changes

- Allow adapter maps whose keys name sources, with `defaultSource`; keep arrays as a compatible
  registration form. Nested Providers inherit sources and override them by name. Each record
  selects one source without automatic fan-out.
- **BREAKING**: address persisted records by `StoreId` (`path + name + id`) and field, using
  existing cache scopes instead of a second dashboard-specific key system.
- **BREAKING**: make partial commits, ordered I/O and stale-operation protection the common
  persistence contract without a public `mode` or a parallel legacy implementation.
- Add optional `schema: { version, minVersion, migrate, validate }` for independent record
  versions. Separate decoding, migration and validation; protect future versions against writes.
- **BREAKING**: remove `zodParam` and validator subpaths. Integrate Zod through
  `schema.validate: value => zodSchema.parse(value)` after migration.
- Restore a new instance automatically on connection; provide timeout, accurate restore/write
  status, subscriptions, explicit `restore()` retries and awaitable `flush()`.
  Timeout never saves defaults, late responses cannot apply, and cache hits do not read again.
- Add record and scope reset: restore initial defaults for active/retained instances, delete
  overrides of unmounted components, and establish barriers against reads/writes.
- Extend common error handling with source, address/scope and operation. Cover sync throws and
  async rejections while preserving usable in-memory state.
- **BREAKING**: correct async `useHydrated` timing and the custom adapter contract. Preserve
  synchronous URL navigation, readable query keys and existing container migration semantics.
- Release these incompatible changes deliberately as minors: an explicitly agreed exception
  limited to this change, documented in the migration guide, changeset and release notes.

## Capabilities

### New Capabilities

- `store-persist-sources`: source registration, resolution, inheritance and stable registries.
- `store-persist-addressing`: shared cache/persistence addresses, store boundaries and preservation of untouched records.
- `store-persist-schema`: independent versions, value migration/validation and future-format protection.
- `store-persist-restoration`: automatic restoration, timeout, status and instance lifecycle.
- `store-persist-operations`: write queue, errors, flush and complete record/scope reset.

### Modified Capabilities

None. `data-grid-state-persistence` describes extracting grid state and restoring it through
`initialState`; this change does not alter its requirements or forced-column rules.

## Impact

- `packages/store-persist`: provider, accessor/decorator descriptors, plugin/binding/engine,
  handles, storage/IndexedDB/URL ports and public types.
- `packages/store-core`: canonical addresses, scope matching and necessary context-store
  addressing support. No I/O, schema or migration logic belongs here.
- `packages/zu-store`: typed `withPersist`, context/cache wiring, `StoreProvider` and exports.
- `packages/va-store`: required adaptation of the shared public surface and contract tests,
  because this binding re-exports the changed engine. No separate storage implementation.
- `apps/docs`, READMEs, migration guide, changesets and docs guards: update examples, remove
  validator exports, and document custom backend requirements and concurrency limits.
- Packages retain independent versions and coordinated dependency floors without a fixed/linked
  group. General semver policy remains unchanged outside this exception.
- Old storage keys are neither removed nor inferred automatically; transfer requires an explicit
  application mapper. Dashboard components, loader/resize UI, fallback/backend composition,
  device synchronization and a concrete server backend are outside scope.

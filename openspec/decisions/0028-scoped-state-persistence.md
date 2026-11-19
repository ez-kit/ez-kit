# 0028. Scoped state persistence and operation ownership

- Status: Accepted
- Recorded: 2026-11-13
- Related: [0017](./0017-release-from-develop.md), [change design](../changes/scoped-state-persistence/design.md)

## Decision

Persistence uses one engine per registered source, with manager-specific StorePort on each binding.
Records use canonical `(StoreId, field)` addresses, independent schema versions and partial commits.
Initial restore belongs to the instance lifecycle; off-band status, revision fences and reset barriers
prevent stale reads or acknowledgements from replacing newer intentions. Source registries are stable
for the lifetime of their instances. Full scope deletion requires persistent enumeration by the adapter.
There is one public contract, without a mode switch or a parallel legacy engine.

## Context, rationale and rejected alternatives

Flat field keys collided across panels and screens; whole-container writes could discard closed panels.
StoreId already models structural scope and cache identity, so persistence extends it rather than
introducing a second identity system. Adapter maps provide aliases; explicit source overrides the
inherited default. Replacing a backend/account requires remounting its registry and cache.

Serialization decodes first, then a synchronous migration transforms unknown old data, then validation
returns the current typed value. Zod remains an application validator rather than a runtime dependency
or a special parser. Version metadata belongs to each field, separately from container migration.
Future versions block ordinary writes, including writes made after an unread request times out.
Only explicit reset permits deleting such data.

Restore runs automatically after commit; a pure synchronous seedRender hook supports request URL
seeding in server and client render without ambient I/O. Cached React instances defer plugin setup to
observer attachment. A cache hit keeps the tracker; GC creates a new lifecycle. Timeout and read failure
do not authorize writing defaults. User edits remain protected even after returning to the default.

The source queue separates desired and acknowledged revisions. Flush waits for its captured revisions;
newer edits do not extend its fence. Reset restores snapshots in place and queues deletion before later
edits. Failed deletion remains retryable; successful sources do not roll back when another fails.
Status and control handles are absent from store serialization/history.

URL remains readable and navigable through router adapters, with foreign query parameters preserved.
It explicitly lacks record-version and full unmounted-scope deletion capabilities. Custom backends
must acknowledge mutations and provide conditional version checks/full namespace deletion where
advertised. Client ordering is not a distributed transaction or a cross-tab compare-and-swap guarantee.

Guards: store-core/store-id.test.ts; store-persist/scoped-{sources,lifecycle,ssr} tests; IndexedDB/storage
tests; scoped-store tests in both bindings; docs mixed-persistence and scoped-persistence browser tests.

Rejected: a second scope/key system, parser-owned migration/validation, a manual restore effect for
every consumer, mounted-only scope reset, and maintaining two engines behind mode.

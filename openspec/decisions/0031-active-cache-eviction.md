# 0031. Active cache eviction and container termination

- Status: Accepted
- Recorded: 2026-11-19
- Related: [0030](./0030-cached-render-candidate-ownership.md), [0028](./0028-scoped-state-persistence.md)

## Decision

Manual cache remove/clear retains entries with committed observers and marks them for eviction when
the last observer leaves. That intent overrides normal keepalive and survives synthetic reconnects.
The outer cache Provider owns the whole container lifetime: its termination forcibly disposes every
entry and prevents new entries from being created in the disposed container.

## Context, rationale and rejected alternatives

Immediate eviction ran capability cleanup while mounted children still held the original raw store.
React saw the same instance identity and did not reconnect it; edits remained visible while persistence
silently stopped. A remove button must not leave a live owner with partially disabled behavior.

Deferring active eviction retains raw manager identity, subscriptions and multi-owner consistency.
Idle entries are still evicted immediately. A zero-delay idle transition permits StrictMode's synthetic
reconnect to retain active resources while preserving the removal intent for the real final departure.
Container disposal is separate because no owner can outlive its owning container; ordinary keepalive
must not retain resources after it disappears.

Rejected: silently disabling capabilities, replacing stores beneath active owners, rejecting an entire
prefix clear because one matching entry is mounted, and treating a finite GC timeout as container
termination. Resetting state or deleting persisted data remains an explicit persistence operation.

Guards: store-core/src/cache/active-eviction.test.tsx and provider-lifetime.test.tsx;
apps/docs/test/persist-cache-owner.test.tsx verifies continued flush and fresh restoration through
both bindings, with and without StrictMode.

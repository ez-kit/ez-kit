# 0030. Cached render candidates and committed ownership

- Status: Accepted
- Recorded: 2026-11-16
- Related: [0028](./0028-scoped-state-persistence.md), [change design](../changes/scoped-state-persistence/design.md)

## Decision

Compatible cold React owners of one cached address share a weak render candidate before descendant
mount effects. Compatibility requires the same defaultValue reference and service registry; conflicting cold initialization is diagnosed at commit. Only committed observers establish
retained cache/plugin ownership. Render-scoped navigation changes initialization context separately
from the stable persistence engine registry, so abandoned URL seeds cannot own the next location.

## Context, rationale and rejected alternatives

Pure owner-local candidates prevented abandoned Suspense renders from retaining defaults/services,
but two simultaneous cold owners exposed different raw stores to child mount-only effects before
passive cache adoption. Eventual convergence could not recover actions on the discarded instance.

Weak candidate sharing is scoped to a cache/address and exact initialization identity. It retains no
store through the index, performs no ambient I/O or setup in render, and keeps raw manager identity.
Commit ownership diagnostics reject incompatible cold initializers rather than silently discarding
one initialized store. A commit-phase error does not promise suppression of all React child effects.
Warm cache hits retain the already committed instance as before.

The persistence provider publishes a pure render-seed service stamp for navigation, while preserving
PersistEngines identity. A changed URL therefore cannot reuse an abandoned candidate from an older
location under otherwise stable engines.

Rejected: transparent manager-sensitive proxy handles, retaining strong render reservations, timing
or microtask expiry as a substitute for commit authority, switching identities only after child
effects, and gating SSR/Suspense children behind an extra empty commit.

Guards: store-core/src/cache/react-lifecycle.test.tsx; store-persist/src/provider-render-context.test.tsx;
apps/docs/test/persist-render-context.test.tsx. These cover layout/passive initialization, abandoned
Suspense defaults/services, cleanup/GC, stable engines and changed uncommitted URL seeds.

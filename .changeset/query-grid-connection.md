---
'@ez-kit/data-grid-react': minor
'@ez-kit/qc-react': patch
---

Add `withQuery` at `@ez-kit/qc-react/data-grid` to connect existing grid bundles to typed TanStack Query sources. Support component and explicit-table usage, applied filters, server pagination, infinite collections, and explicitly enabled source mutations. Keep native query keys and lifecycle behavior, with non-blocking list invalidation after successful built-in mutations.

Add an optional configuration transform to the grid's bound hook after factory, provider and instance defaults merge. The connector uses this neutral bridge to publish data and loading through the existing grid configuration; the base grid does not depend on Query. The connector requires the grid release containing this bridge.

Keep successful persistence independent of background invalidation failures, including synchronous errors in application-provided query predicates. Continue processing the remaining cache filters and preserve awaited native mutation lifecycle callbacks and original errors.

Accept native `infiniteQueryOptions` descriptors whose stored page parameters are unknown without weakening the typed cursor callbacks.

Expose typed `createListSource` and `createInfiniteSource` helpers for endpoints outside a shared API convention. Allow unknown totals via `getRowCount` returning `undefined`, and wait for background refetch before correcting a restored page from cached totals.

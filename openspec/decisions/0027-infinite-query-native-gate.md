# 0027. InfiniteQuery shares query gate states and preserves native pagination

- Status: Accepted
- Recorded: 2026-11-05
- Related: [0022-query-gate-native-tanstack](./0022-query-gate-native-tanstack.md)

## Decision

`InfiniteQuery` accepts native infinite-query options through `query`, infers its types from
those options, and passes the unchanged `useInfiniteQuery` result to `children(data, q)` and
`error(error, q)`. It uses Query's data-first state resolution and QueryProvider fallbacks.
Pagination, cache structure and fetching policy remain TanStack's responsibility.

## Context, rationale and rejected alternatives

The first load needs the same idle/loading/error handling as Query. After pages exist, a
subsequent request or error should not discard the list. Checking data before status provides
this behavior for pagination and background refetches alike. Returning the native result keeps
both pagination directions, flags and select output accessible without a new vocabulary.

The shared provider exposes common query-result fields; pagination-specific fallbacks belong
on the local gate, where the full infinite result is typed. A second provider or automatic
scroll observer would add policy the application can already compose with native methods.

Guards: `packages/query/react/src/infinite-query.test.tsx`, `infinite-query.types.test.tsx`,
`hydration.test.tsx` and the registered-error type project cover pagination failures, inference,
subscription isolation, shared fallbacks and cache hydration.

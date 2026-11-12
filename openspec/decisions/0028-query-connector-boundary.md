# 0028. Query connectors extend existing grid bundles

- Status: Accepted
- Recorded: 2026-11-12
- Related: [0003](./0003-consumer-composed-features.md), [0016](./0016-bundle-types-inline-columns.md), [0026](./0026-composed-grid-reactivity.md)

## Decision

Query integration lives in `@ez-kit/qc-react/data-grid`, with React and TanStack
Query peers and the shared grid peer required for this entry. The base grid stays
library-neutral and the connector imports no visual kit. `withQuery(bundle)`
preserves the bundle's types and compound surface, supporting either inline
`dataSource` or connected `useDataGrid` plus a supplied table. Native options are
the execution contract; fetcher factories and standalone read helpers normalize
to it. Operations supply capabilities; grid features still need explicit enablement.

## Context, rationale and rejected alternatives

This records D1–D4 of `qc-react-data-grid`. Putting Query in the grid would make
all grid consumers inherit one request library. Putting the grid in query-react
would couple its rendering gates to an unrelated UI contract. A separate connector
keeps these dependencies optional, with no premature qc-core or form integration.
Future SWR/RTK adapters need not emulate TanStack keys/options; the shared grid's
neutral rows/totals/loading/callback boundary is the extensibility point.

One connection implementation keeps table identity and hook order stable through
page-mode switches. It uses the shared config-transform bridge and existing
publication channels, rather than mutating unobserved table options or adding a
second server-data store. A supplied table is not connected twice.

`createGridSourceFactory` defines a typed API convention; an application can
supply its row type once in `makeSource<User>()`. Bare fetchers inherit defaults,
expanded operations replace supplied properties, and `options` replaces the whole
options object without deep-merging callbacks. Independent endpoint request or
selected-result types use `createListSource` / `createInfiniteSource` with
`defineGridDataSource`. Public inference must not hide mismatches behind `any`.

`prepareArgs` is synchronous and constructs the fetcher's argument, not a mandated
HTTP envelope. Generated clients own path/query/body placement; read wrappers
forward signals separately. Update receives a possibly missing original row,
values and grid row ID; deletion receives original entities. Grid IDs need not be
API IDs. Native response shapes remain in Query's cache and projections consume
selected observer data. Orval is the reproducible example, not a runtime dependency
or a required generator.

Explicit grid handlers replace connector execution and invalidation for that
action. Merely supplying an update source must never turn editing on. This does
not introduce the global feature typing gate rejected in ADR 0003.

Guards: `packages/qc/react/src/data-grid/with-query-types.test.tsx`,
`factory-inference.test.ts`, `source.test.ts`, `with-query.test.tsx`,
`with-query-kits.test.tsx`, and `packages/qc/react/test/orval.test.ts`.

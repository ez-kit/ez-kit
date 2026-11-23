# @ez-kit/qc-react

## 0.2.0

### Minor Changes

- eb9f79e: Compare each applied grid criterion with Object.is for page resets. Controlled objects and
  arrays need stable references until their value changes.

  Check raw initial data against the fetcher response and reflect optional selectors in the
  collection query result. Infer grid rows from a concrete source to preserve projection and
  mode checks instead of supplying only the row type to useDataGrid.

- fc46ace: Require stable row IDs for connected edit and delete actions. Keep controlled page resets pending,
  suppress cross-scope placeholder data before projection, and allow explicit dataset scope keys.
  Coalesce pending deletion targets without cancelling independent deletes.

  Use prepareKey to separate generated cache identity from non-serializable transport arguments.
  Shape-changing native descriptors require an explicit selector, and structural projections must
  accept raw data when their selector is optional.

- 4cda640: Scope connected form drafts, delete confirmations and bulk selection updates to their write owner.
  Prevent pre-dispatch deletion after cancellation and show failures from built-in delete actions
  while preserving imperative rejection. Keep disabled infinite reads from loading more pages.

  Connected grids own query notifications. Remove `notifyOnChangeProps` from grid `queryOptions`
  if previously set. Structural reads must provide compatible query options and projections, and
  a grid factory can only inherit cursor settings when it has infinite defaults.

- 80b6f61: Add the UI-independent query-react/collection entry with typed collection sources, shared API conventions, ordinary/infinite reads and native CRUD mutation results. Fetcher mutations prepare arguments inside mutationFn and invalidate collection families after success without awaiting refresh.

  Reuse collection execution in qc-react and add createGridSourceFromCollection for sharing business sources with ordinary lists. Preserve existing grid source callback variables, table-owned parameters and modal lifecycle behavior.

- 6a80f60: Configure both page and infinite loading in a collection source’s `read` block. Pass the controlled pagination
  object to useCollectionQuery and receive the current page position in prepareArgs. Connect a
  createDataGridSource result directly to a Query-enabled DataGrid. Replace the standalone grid read
  constructors and grid-to-collection source adapter with the shared collection API.

### Patch Changes

- 4d4b2bd: Preserve QueryClient mutation success defaults and isolate grid factory mutation retries across source ownership changes with generated mutation keys. Retain optional collection capabilities in public types, require complete read configuration, and reject incompatible row projections when adapting dual-mode collections to a grid.
- 0b68f10: Keep pending collection mutations in their original scope when capabilities disappear, and require source keys for generated writes alongside native reads. Reject unsafe raw/selected projection contracts and primitive rows in collection-to-grid adapters.
- a214b41: Use committed options and rows for connected grid writes during concurrent rendering. Block
  bulk actions from stale controlled selection after a scope change. Dismiss delete confirmations
  without cancelling active deletes, and retain same-scope target reservations until settlement.
- 13fa65e: Expose per-grid query observer options and silently cancel validation when mutation ownership changes.
  Add creating/editing cancelValidation to retain form values while abandoning pending checks without
  interrupting dispatched saves.
- bc50d51: Keep connected write actions on the visible grid's columns and callbacks during Suspense, and use
  the current visible tree rows for deletion. Hide selection actions until the controlled selection
  resets after a scope change. Guard native placeholder data before projection, preserve placeholders
  supplied by the new read, and validate every option branch and explicitly configured pagination mode.
- e467391: Add `withQuery` at `@ez-kit/qc-react/data-grid` to connect existing grid bundles to typed TanStack Query sources. Support component and explicit-table usage, applied filters, server pagination, infinite collections, and explicitly enabled source mutations. Keep native query keys and lifecycle behavior, with non-blocking list invalidation after successful built-in mutations.

  Add an optional configuration transform to the grid's bound hook after factory, provider and instance defaults merge. The connector uses this neutral bridge to publish data and loading through the existing grid configuration; the base grid does not depend on Query. The connector requires the grid release containing this bridge.

  Keep successful persistence independent of background invalidation failures, including synchronous errors in application-provided query predicates. Continue processing the remaining cache filters and preserve awaited native mutation lifecycle callbacks and original errors.

  Accept native `infiniteQueryOptions` descriptors whose stored page parameters are unknown without weakening the typed cursor callbacks.

  Expose typed `createListSource` and `createInfiniteSource` helpers for endpoints outside a shared API convention. Allow unknown totals via `getRowCount` returning `undefined`, and wait for background refetch before correcting a restored page from cached totals.

  Expose `createGridDataSource` for adapting existing native TanStack options while preserving their keys and explicit invalidation scope.

- 9ef8578: Scope infinite loader state to the active collection, ignore stale cached totals during page correction,
  and support automatic mutations invoked from early consumer effects. Add a neutral loadMoreKey for
  base-grid loaders. Enforce safe projections in direct grid helpers and preserve complete observer
  option types for structural collection sources.
- e5192bf: Reject automatic saves whose ownership changes during validation, scope infinite load-more deduplication by query identity, and isolate inactive observers from application defaults. Tighten native projection and inherited-total types. Require TanStack Query 5.105.3 or newer within v5 and verify published declarations against the exact minimum version.
- Updated dependencies [4d4b2bd]
- Updated dependencies [948d2ef]
- Updated dependencies [0b68f10]
- Updated dependencies [a214b41]
- Updated dependencies [eb9f79e]
- Updated dependencies [e467391]
- Updated dependencies [95728f9]
- Updated dependencies [fc46ace]
- Updated dependencies [bc50d51]
- Updated dependencies [e467391]
- Updated dependencies [9ef8578]
- Updated dependencies [e5192bf]
- Updated dependencies [4cda640]
- Updated dependencies [80b6f61]
- Updated dependencies [6a80f60]
  - @ez-kit/query-react@0.3.0
  - @ez-kit/data-grid-react@0.20.0

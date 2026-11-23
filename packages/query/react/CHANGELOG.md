# @ez-kit/query-react

## 0.3.0

### Minor Changes

- 948d2ef: Allow per-consumer collection loading and refetch options while preserving source-owned cache identity. Infer shape-changing entity selections in shared collection factories, with explicit item projections and safe total handling for list and infinite reads.
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
- bc50d51: Keep connected write actions on the visible grid's columns and callbacks during Suspense, and use
  the current visible tree rows for deletion. Hide selection actions until the controlled selection
  resets after a scope change. Guard native placeholder data before projection, preserve placeholders
  supplied by the new read, and validate every option branch and explicitly configured pagination mode.
- 9ef8578: Scope infinite loader state to the active collection, ignore stale cached totals during page correction,
  and support automatic mutations invoked from early consumer effects. Add a neutral loadMoreKey for
  base-grid loaders. Enforce safe projections in direct grid helpers and preserve complete observer
  option types for structural collection sources.
- e5192bf: Reject automatic saves whose ownership changes during validation, scope infinite load-more deduplication by query identity, and isolate inactive observers from application defaults. Tighten native projection and inherited-total types. Require TanStack Query 5.105.3 or newer within v5 and verify published declarations against the exact minimum version.

## 0.2.0

### Minor Changes

- f46a151: Add a headless Mutation component that passes the native useMutation result to a render function and isolates its subscription from its parent.
- f46a151: Add InfiniteQuery with native pagination results and shared QueryProvider fallbacks. Document pagination, Query and Mutation workflows, optimistic updates, form errors, server prefetching and hydration.

## 0.1.0

### Minor Changes

- 0151ca6: First release: a declarative gate for TanStack Query v5. `<Query query={queryOptions(...)}>{(data, q) => …}</Query>` calls `useQuery` itself and renders `children` whenever the query has data — including during a background refetch, with placeholder data and after a failed background refetch — or a `loading` (first load), `idle` (disabled query) or `error(error, q)` (failed without data) fallback until then. Only the gate subscribes to the query, so its parent and siblings do not re-render when it loads, refetches or fails. `data` is never `undefined`, `q` is the `useQuery` result unchanged, and every type is inferred from `query`, `select` included. `<QueryProvider loading idle error>` sets the fallbacks for every gate below it, key by key over an enclosing provider; a gate's own prop wins. An error with no fallback is thrown to the nearest error boundary, and resetting the boundary refetches the query.

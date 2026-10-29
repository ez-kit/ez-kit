# @ez-kit/query-react

## 0.1.0

### Minor Changes

- 0151ca6: First release: a declarative gate for TanStack Query v5. `<Query query={queryOptions(...)}>{(data, q) => …}</Query>` calls `useQuery` itself and renders `children` whenever the query has data — including during a background refetch, with placeholder data and after a failed background refetch — or a `loading` (first load), `idle` (disabled query) or `error(error, q)` (failed without data) fallback until then. Only the gate subscribes to the query, so its parent and siblings do not re-render when it loads, refetches or fails. `data` is never `undefined`, `q` is the `useQuery` result unchanged, and every type is inferred from `query`, `select` included. `<QueryProvider loading idle error>` sets the fallbacks for every gate below it, key by key over an enclosing provider; a gate's own prop wins. An error with no fallback is thrown to the nearest error boundary, and resetting the boundary refetches the query.

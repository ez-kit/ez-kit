---
'@ez-kit/data-grid-core': major
'@ez-kit/data-grid-react': major
---

Replace the boolean loading state with a fully-controlled `state.loading` slice.

**Breaking changes**

- `state.loading` is reshaped from the old boolean form (`{ isLoading }`) into a
  React-Query-mirror slice: `{ isPending, isFetching, isError, error }`. It is **fully
  controlled** — feed every field through the controlled `state` prop (e.g. straight
  from a React Query / SWR `useQuery` result or local `useState`):
  `state: { loading: { isPending, isFetching, isError, error } }`. The grid only reads
  this slice to render (`isPending` → skeleton, `isFetching` → refetch overlay,
  `isError`/`error` → error status).
- The grid-owned write channel is removed: `table.setFetchingStatus()`,
  `table.getIsLoading()`, and `table.setLoading()` no longer exist (no compat shim).
  There is no single-writer setter — the consumer owns the slice via the controlled prop.
- Type export change: `LoadingState` is now `{ isPending, isFetching, isError, error }`.

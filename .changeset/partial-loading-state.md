---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

`state.loading` and `initialState.loading` take a partial object. Name only the fields you have —
`state={{ loading: { isPending } }}` for a list loaded once — and the rest default: the flags to
`false`, `error` to `null`. The slice the grid holds is unchanged: the store, every selector and
`onStateChange` still see all four fields of `LoadingState`, so nothing that reads it changes.

- A full object behaves exactly as before, and a TanStack Query result still passes through whole
  (`state={{ loading: query }}`). The grid now keeps only `isPending`, `isFetching`, `isError` and
  `error` from it rather than storing the object as given; `LoadingState` never declared any other
  field.
- An equal `state.loading` no longer rewrites the slice on every commit. A new object with the same
  four values keeps the previous slice, so a query result that changed only its `data` no longer
  republishes loading status.
- In development, a `loading` object that carries keys the slice does not know and none of
  `isPending` / `isFetching` / `isError` warns. That is the shape of an SWR response passed whole:
  the partial type accepts it through its shared `error` key, and the grid would never show a
  loading state. Map `isLoading` / `isValidating` onto `isPending` / `isFetching` instead.
- New type `ControlledTableState<TFeatures>`, exported from `@ez-kit/data-grid-react`: the type of
  the `state` option. It is `Partial<TableState<TFeatures>>` with a partial `loading`, and state
  typed as `Partial<TableState<TFeatures>>` keeps assigning to it. `InitialTableState` gains the
  same partial `loading`.

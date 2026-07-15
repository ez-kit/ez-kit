# @ez-kit/data-grid-core

## 0.1.0

### Minor Changes

- 98e9b0c: Invert the custom column `visibility` prop semantics. The prop is now `visibility?: true | ColumnVisibilityDef`: `visibility: true` marks the column as always visible / locked (cannot be hidden — no Hide option in its menu and absent from the Columns toggle), replacing the previous `visibility: false`. The object form `{ defaultHidden: true }` is unchanged (a column that starts hidden but can be toggled on). This is a breaking change — replace any `visibility: false` with `visibility: true`.
- 1edda75: Replace the boolean loading state with a fully-controlled `state.loading` slice.

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

- 6c179f3: Show filter operators as English text instead of icon symbols. The `symbol` field is removed from `FilterOperatorDef`, and every operator surface — the operator select (shadcn / heroui / native) and the active-filter chips — now renders `label` (`Contains`, `Greater than`, `Between`…) rather than a glyph (`⊇`, `>`, `↔`). This is a breaking change: drop `symbol` from any custom operator definition, and rely on `label` for the user-facing text.
- 146122e: Add `pagination.variant` for the page-based footer: `'numbered'` (the default), `'simple'` (prev/next + an "X–Y of N" range label) and `'compact'` (prev/next + "Page X of Y"). The option takes the `PaginationVariant` string union, so no import is needed; the exported `PaginationVariants` const object (`PaginationVariants.Simple`) is optional sugar for the same values. The variant is presentational only — paging behaviour is identical across variants and the footer position is unchanged. Load-more is not a variant; it remains `pagination: { mode: 'infinite', trigger: 'manual' }`.

  `'numbered'` keeps its existing layout in the shadcn and heroui kits — prev/next, a link per page, and the range label. Its label does change where the old one was wrong: a partial last page read `1–6 of 11` and now reads `1–10 of 11` (see the `pageSize` fix below).

  **In the native kit the `'numbered'` footer changes shape**: it previously rendered `«  ‹  1 / 5  ›  »` and now renders the range label plus a button per page (`«  ‹  1–10 of 50  1 2 3 4 5  ›  »`), matching the other kits and the variant's name. Pass `variant: 'compact'` for a footer close to the old native default.

  Breaking for custom `Pagination` components supplied via `createDataGrid({ components })`:
  - `PaginationProps.variant` (`PaginationVariant`) and `PaginationProps.pageSize` (`number`) are new **required** props.
  - `PaginationProps.pageCount` is now **optional** (`number | undefined`). It is `undefined` when the total is genuinely unknown — a manually paginated grid given neither `rowCount` nor `pageCount`. Previously the core `-1` sentinel leaked through and rendered verbatim (`"Page 1 of -1"`).
  - `PaginationProps.rowCount` is now `undefined` whenever the total is unknown, instead of echoing the loaded page length. It is no longer inferred from `getRowCount()` under `manualPagination`, which produced inverted ranges such as `"21–10 of 10"`.
  - `pageSize` is passed through from the table state rather than derived as `ceil(rowCount / pageCount)`, which was wrong on a partial last page (11 rows at `pageSize: 10` produced `"1–6 of 11"`).

  Core now exports `UNKNOWN_PAGE_COUNT` (the `-1` sentinel it hands to TanStack), and the React package exports `buildPaginationLabel` — the shared footer-label rule every UI kit renders.

- a449e93: Remove the `sorting.defaultSorting` prop. It was duplicate sugar over `initialState.sorting`. To set an initial sort, use `initialState.sorting` (TanStack-style), consistent with every other feature's initial state. This is a breaking change — replace `sorting: { defaultSorting: [...] }` with `initialState: { sorting: [...] }`.

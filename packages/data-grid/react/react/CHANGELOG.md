# @ez-kit/data-grid-react

## 0.1.0

### Minor Changes

- 005a133: Add state-persistence utilities: `extractState(table)` reads the persistable grid slices into a JSON-safe `DataGridState`, `parseState(stored)` validates and prunes an untrusted stored value back into that shape (feed it to `useDataGrid`'s `initialState`), and the reactive `useExtractedState(grid)` hook returns the always-current extracted state for save-on-change. Storage read/write stays consumer-owned; slice selection is controlled via `keys` (default excludes `rowSelection` and `expanded`). Exposes `PERSISTABLE_STATE_KEYS` / `DEFAULT_STATE_KEYS` and the `DataGridState` / `DataGridStateOptions` / `PersistableStateKey` types.
- f81d1af: Fix infinite scroll's auto trigger in collection-rendering UI kits (HeroUI), and detect the
  bottom edge by measuring the scroll container instead of observing a sentinel row.

  The loader footer rendered a raw `<tr>` sentinel into `Tbody`. HeroUI renders `Tbody` as a
  React Aria collection, which keeps only its own `Row` children and builds them in a pass
  before the real DOM exists — so the collection dropped the whole footer, and the sentinel's
  ref resolved to a collection node rather than an element. `IntersectionObserver.observe()`
  threw and took the grid down with it; in `manual` mode the same drop silently removed the
  "Load more" button. Detection now measures the scroll container, which this package owns, so
  it no longer depends on how a kit renders rows. Infinite scroll also resolves that container
  directly rather than through `resolveScrollElement()`, which finds the first _horizontal_
  scroller (HeroUI's inner `ScrollContainer` — it grows with its content and never scrolls
  vertically, so it read as "already at the bottom" forever and broke reset-to-top).

  Two breaking changes:
  - The `data-slot="load-more-sentinel"` element is gone. Remove any styling or queries that
    target it; `data-slot="load-more-row"` is unchanged.
  - Auto detection now requires a container that actually scrolls vertically — give the grid a
    bounded height via `stickyHeader` or `--dg-table-max-height`. When the rows never overflow
    there is no edge to reach and nothing auto-loads; use `trigger: 'manual'` for that case.

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

- 1edda75: Re-export the TanStack `SortingState`, `ColumnFiltersState`, and `PaginationState` types from `@ez-kit/data-grid-react`. These are the value types delivered to the manual server-side `sorting.onChange` / `filtering.onChange` / `pagination.onChange` handlers, so consumers can type their server-data state without depending on `@tanstack/table-core` directly.

### Patch Changes

- 803b41b: Fix: manual-pagination `rowCount` / `pageCount` are now re-synced on every render instead of being frozen at the value present on first mount. Previously, feeding a reactive server total (e.g. `rowCount: q.data?.rowCount ?? 0`, which starts at `0` and updates after the first fetch — exactly the documented React Query pattern) left `getPageCount()`, the "X of N rows" display, and the next-page button stuck on the initial value. `useDataGrid` now projects the latest `pagination.rowCount` / `pagination.pageCount` into the table options, mirroring how `createTable` applies them at creation time.
- Updated dependencies [98e9b0c]
- Updated dependencies [1edda75]
- Updated dependencies [6c179f3]
- Updated dependencies [146122e]
- Updated dependencies [a449e93]
  - @ez-kit/data-grid-core@0.1.0

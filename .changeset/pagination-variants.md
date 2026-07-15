---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
'@ez-kit/data-grid-native': minor
---

Add `pagination.variant` for the page-based footer: `'numbered'` (the default), `'simple'` (prev/next + an "X–Y of N" range label) and `'compact'` (prev/next + "Page X of Y"). The option takes the `PaginationVariant` string union, so no import is needed; the exported `PaginationVariants` const object (`PaginationVariants.Simple`) is optional sugar for the same values. The variant is presentational only — paging behaviour is identical across variants and the footer position is unchanged. Load-more is not a variant; it remains `pagination: { mode: 'infinite', trigger: 'manual' }`.

`'numbered'` keeps its existing layout in the shadcn and heroui kits — prev/next, a link per page, and the range label. Its label does change where the old one was wrong: a partial last page read `1–6 of 11` and now reads `1–10 of 11` (see the `pageSize` fix below).

**In the native kit the `'numbered'` footer changes shape**: it previously rendered `«  ‹  1 / 5  ›  »` and now renders the range label plus a button per page (`«  ‹  1–10 of 50  1 2 3 4 5  ›  »`), matching the other kits and the variant's name. Pass `variant: 'compact'` for a footer close to the old native default.

Breaking for custom `Pagination` components supplied via `createDataGrid({ components })`:

- `PaginationProps.variant` (`PaginationVariant`) and `PaginationProps.pageSize` (`number`) are new **required** props.
- `PaginationProps.pageCount` is now **optional** (`number | undefined`). It is `undefined` when the total is genuinely unknown — a manually paginated grid given neither `rowCount` nor `pageCount`. Previously the core `-1` sentinel leaked through and rendered verbatim (`"Page 1 of -1"`).
- `PaginationProps.rowCount` is now `undefined` whenever the total is unknown, instead of echoing the loaded page length. It is no longer inferred from `getRowCount()` under `manualPagination`, which produced inverted ranges such as `"21–10 of 10"`.
- `pageSize` is passed through from the table state rather than derived as `ceil(rowCount / pageCount)`, which was wrong on a partial last page (11 rows at `pageSize: 10` produced `"1–6 of 11"`).

Core now exports `UNKNOWN_PAGE_COUNT` (the `-1` sentinel it hands to TanStack), and the React package exports `buildPaginationLabel` — the shared footer-label rule every UI kit renders.

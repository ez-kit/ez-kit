# @ez-kit/data-grid-heroui

## 0.1.1

### Patch Changes

- c76b87b: fix(heroui): lay columns out on the model's widths so pinning lands where it should

  The kit left column widths to native table layout, so the rendered widths drifted from the
  table model (a long cell value stretched its column past its declared `size`). Every pin
  offset is computed from that model, so pinned columns stuck at the wrong place — leaving a
  gap between neighbouring pinned columns that the scrolling content showed through — and the
  pin shadow floated over the middle of the table instead of hugging the pinned edge.

  Rows now carry the same CSS grid column template shadcn uses, so the rendered widths are the
  model widths. Column `size` (and therefore column resizing) now takes effect in this kit.

  Also drops the sample label HeroUI's docs example ships on `Checkbox.Content`, which was
  printing "Enable email notifications" next to every selection checkbox.

- Updated dependencies [904d9df]
- Updated dependencies [6cf77ea]
  - @ez-kit/data-grid-react@0.1.1

## 0.1.0

### Minor Changes

- 24bf599: Re-export the full consumer surface from the kit packages, so a kit is self-sufficient and consumers no longer need `@ez-kit/data-grid-react` as a second dependency to reach it.

  Newly available from `@ez-kit/data-grid-shadcn` and `@ez-kit/data-grid-heroui`:
  - values — `defineColumns`, `extractState`, `parseState`, `useExtractedState`, `ValidationError`
  - types — `ColumnDef`, `ColumnFiltersState`, `DataGridProps`, `DateRangePreset`, `SortingState`, `TableState`

  ```ts
  // before — two packages
  import { DataGrid, useDataGrid } from '@ez-kit/data-grid-shadcn'
  import { defineColumns } from '@ez-kit/data-grid-react'

  // after — one
  import { DataGrid, useDataGrid, defineColumns } from '@ez-kit/data-grid-shadcn'
  ```

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

### Patch Changes

- Updated dependencies [005a133]
- Updated dependencies [f81d1af]
- Updated dependencies [1edda75]
- Updated dependencies [6c179f3]
- Updated dependencies [803b41b]
- Updated dependencies [146122e]
- Updated dependencies [1edda75]
  - @ez-kit/data-grid-react@0.1.0

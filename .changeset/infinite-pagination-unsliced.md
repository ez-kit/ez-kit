---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

**`pagination.mode: 'infinite'` shows every loaded row again, whatever the feature set registers.**

Since 0.7.0 (the TanStack Table v9 migration, #246) an infinite grid whose set registered
`paginatedRowModel` — `allDataGridFeatures` does — rendered only the first page of its rows:
`onLoadMore` fired and `data` grew, but the rows were still sliced by `pageIndex` / `pageSize`, so
loading looked broken. The only way out was a second feature set without the model.

The mode is now config again rather than a feature-set decision. In infinite mode the table runs
with `manualPagination: true`, so `getRowModel()` returns every accumulated row with or without
`paginatedRowModel`, and one set serves a paged grid and an infinite one — including on a live
instance switched from one mode to the other. A set without the model keeps working exactly as
before, so a workaround such as a separate infinite-only set can be dropped whenever convenient.
The development warning telling you to drop `paginatedRowModel` is gone.

Two consequences worth knowing:

- **`table.options.manualPagination` is now `true` in infinite mode.** Code that reads that flag as
  "the server pages this grid" should check `pagination.mode` as well.
- **Infinite mode starts at `pageIndex` 0.** A seeded `initialState.pagination.pageIndex` is
  overridden (with a development warning), so it no longer reaches `onStateChange` or persisted
  state; the seeded `pageSize` is kept. Whatever the index later holds, it never shifts the rows
  or `aria-rowindex`.

`@ez-kit/data-grid-react` reads the mode rather than that flag for accessibility. An infinite grid
writes `aria-rowcount="-1"` while `hasNextPage` or `hasPreviousPage` is set and no `aria-rowcount`
once everything has loaded; `aria-rowindex` counts from the first loaded row and is never offset by
`pageIndex`. The row-count live region likewise stays silent while more rows can load, since the
rows on screen are not the total, and announces the count once they all have.

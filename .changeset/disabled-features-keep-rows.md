---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

**A grid without `pagination` shows every row again, whatever the feature set registers — and so
does every other feature the config leaves off.**

Since 0.7.0 (the TanStack Table v9 migration, #246) a grid whose set registered `paginatedRowModel`
— `allDataGridFeatures` does, and so the prebuilt `DataGrid` of both kits — rendered only its first
page when `pagination` was absent, `false` or `{ enabled: false }`: ten rows, no pagination controls,
and the rest unreachable. The core seeds a `pagination` slice on every grid, and upstream slices
whatever it is handed. A seeded `initialState.pagination.pageIndex` hid the first rows as well.

The same was true, less visibly, of a seeded `initialState.grouping` or
`initialState.columnFilters` on a grid without `grouping` or `filtering`: upstream applied them
through the registered row model, and the grid had no control to undo them.

The rule is now the one the core already stated for features: **registering a feature does not
switch it on.** A feature the config leaves off changes no row. Its state is kept rather than
dropped, and takes effect once the feature is switched on, including on a live instance.
`createTable` warns in development about each `initialState` slice seeded for a feature that is
off — `pagination`, `columnFilters`, `grouping`, `sorting`, `globalFilter`, `expanded`,
`rowPinning` — so a seed that seems to do nothing says why. Global search keeps working while
column filters are off.

**If your grid relied on the old behaviour**, it now needs the feature switched on: a grid that
paged through `initialState.pagination` alone needs `pagination`, one that filtered through
`initialState.columnFilters` alone needs `filtering`, and one that grouped through
`initialState.grouping` alone needs `grouping`. The development warning names each case.

Values that change, for code that reads the table directly:

- **`table.options.manualPagination` is `true` on every grid that does not paginate client-side**
  — unpaged, infinite and server-paged alike — and `false` on one that does. Read `pagination`
  itself to tell a server-paged grid apart.
- **`table.options.enableColumnFilters` and `manualGrouping` are written on every call**, `true` or
  `false`, rather than only when the feature is off.
- **With `filtering` off, each column's filter function keeps every row**, and the table's
  `filteredRowModel` is a wrapper around the one in your set, which rebuilds it when column
  filtering is switched. Neither is something to read.

Also fixed on the way: **`pinning: { row: { top: false, bottom: true } }` switches row pinning on.**
The gate read `top ?? bottom`, and an explicit `false` on one side turned row pinning off entirely.

`@ez-kit/data-grid-react` reads the pagination mode rather than `manualPagination` for
accessibility: an unpaged grid writes no `aria-rowcount` and no `aria-rowindex`, and the row-count
live region announces the full total.

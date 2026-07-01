---
'@ez-kit/data-grid-react': patch
---

Fix: manual-pagination `rowCount` / `pageCount` are now re-synced on every render instead of being frozen at the value present on first mount. Previously, feeding a reactive server total (e.g. `rowCount: q.data?.rowCount ?? 0`, which starts at `0` and updates after the first fetch — exactly the documented React Query pattern) left `getPageCount()`, the "X of N rows" display, and the next-page button stuck on the initial value. `useDataGrid` now projects the latest `pagination.rowCount` / `pagination.pageCount` into the table options, mirroring how `createTable` applies them at creation time.

---
'@ez-kit/data-grid-react': patch
---

Clamp `pageIndex` to the last valid page when a manual-pagination `rowCount` shrinks under the user.

TanStack disables `autoResetPageIndex` under `manual: true`, so a server total that narrowed (e.g. a filter cutting 500 rows to 5 while the user sat on page 3) left `pageIndex` stranded past the end: the footer read `0–0 of 5` while all 5 rows were actually on screen. `useDataGrid` now clamps the index via `setPageIndex` — i.e. through the normal `onChange` / `onStateChange` controlled flow — so the footer reads `1–5 of 5`. Only a trusted `rowCount` triggers the clamp; an unknown total is left alone.

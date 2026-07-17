---
'@ez-kit/data-grid-react': patch
---

Clamp `pageIndex` to the last valid page when a manual-pagination `rowCount` shrinks under the user.

TanStack disables `autoResetPageIndex` under `manual: true`, so a server total that narrowed (e.g. a filter cutting 500 rows to 5 while the user sat on page 3) left `pageIndex` stranded past the end: the footer read `0–0 of 5` while all 5 rows were actually on screen. `useDataGrid` now clamps the index via `setPageIndex` — i.e. through the normal `onChange` / `onStateChange` controlled flow — so the footer reads `1–5 of 5`.

Only an actual shrink of a trusted `rowCount` clamps: the first total observed is left alone, since with the usual `rowCount: data?.rowCount ?? 0` the initial `0` means "not loaded yet" and clamping it would reset a deep-linked page mid-fetch. An unknown total is never clamped either.

The clamp lands after commit, so the render in which `rowCount` shrinks still paints the pre-clamp page for one frame. That frame shows the same honest `0–0 of 5` the footer displays today, never an inverted range.

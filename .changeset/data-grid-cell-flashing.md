---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/docs': minor
---

Cell flashing: a cell whose value changes gets a short highlight that fades out, for grids fed by polling or a socket. Register `cellFlashingFeature` and turn it on with `flashing` on the grid; a column's own `flashing` overrides it either way (`false` keeps a column such as an `updatedAt` stamp dark), and its object form sets `flashDuration` / `fadeDuration` and an `equals` for values that are fresh objects on every update. `table.flashCells({ rowIds, columnIds, status })` flashes rendered cells on demand. A flash has a status — `'default' | 'success' | 'warning' | 'error'` — that sets its colour: a column's `flashing.status(previous, next, row)` picks it for automatic flashes (a price that rose in green, one that fell in red), and `flashCells` takes one directly. A flash is not table state: it never reaches `onStateChange` or persistence, and re-renders only the cells that flash. Cells carry `data-flash="flash" | "fade"` and `data-flash-status`; both kits paint the highlight with one token per status, `--dg-flash-background` and `--dg-flash-{success,warning,error}-background`.

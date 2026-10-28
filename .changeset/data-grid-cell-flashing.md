---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/docs': minor
---

Cell flashing: a cell whose value changes gets a short highlight that fades out, for grids fed by polling or a socket. Register `cellFlashingFeature` and turn it on with `flashing` on the grid; a column's own `flashing` overrides it either way (`false` keeps a column such as an `updatedAt` stamp dark), and its object form sets `flashDuration` / `fadeDuration` and an `equals` for values that are fresh objects on every update. `table.flashCells({ rowIds, columnIds })` flashes rendered cells on demand. A flash is not table state: it never reaches `onStateChange` or persistence, and re-renders only the cells that flash. Cells carry `data-flash="flash" | "fade"`; both kits paint the highlight with `--dg-flash-background`.

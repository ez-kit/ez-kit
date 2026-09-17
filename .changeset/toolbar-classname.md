---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

`<DataGrid.Toolbar>` accepts a `className`, with or without `children`, and the kits merge it into
the bar's own class with `cn` — so a utility that collides with one of theirs replaces it. This is
what lets a toolbar be re-used as the header bar of a framed grid: both kits give the bar an `mb-2`
meant for a toolbar standing free above the table, and `mb-0` now removes it.

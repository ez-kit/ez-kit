---
'@ez-kit/data-grid-core': minor
---

`applyRowMove` also takes the application's own rows. Called as
`applyRowMove(rows, move, getRowId)` with the grid's `getRowId`, it returns `rows` with the moved
row lifted out and re-inserted at its target — the whole body of a controlled
`ordering.row.onChange`, which otherwise hand-writes a `findIndex` / `splice` pair. The signature
mirrors `applyRowOrder`. The existing `applyRowMove(order, move)` over an array of ids is unchanged.

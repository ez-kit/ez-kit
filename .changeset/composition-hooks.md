---
'@ez-kit/data-grid-react': minor
---

Add `useDataGridHeaderCell()`, `useDataGridRow()` and `useDataGridCell()` — the three composition
nodes, readable from a hook as well as from a render function.

A render function can only be written at the `<DataGrid.HeaderCell>` / `<DataGrid.Row>` /
`<DataGrid.Cell>` call site, because its parts arrive as arguments, so a layout that customised one
header cell had to carry the whole table tree inline. The same object is now published to a hook,
so the body can be a component that takes no props.

Nothing changes for existing code: each component builds the object once and both passes and
publishes it, so the two forms cannot drift apart. `content` on the row and `value` on the cell are
resolved on first read, which keeps the row's existing skip — a static child that never asks for the
default cells still does not build them.

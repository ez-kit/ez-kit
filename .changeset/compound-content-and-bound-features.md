---
'@ez-kit/data-grid-react': minor
---

Compound composition no longer costs you the default, and a bundle can bind its feature set.

`createDataGrid({ features })` states the set once for a bundle, making `features` optional on the
returned `useDataGrid` and `DataGrid` while the return type still carries it out. A call site that
names a set anyway replaces the bound one rather than merging with it, so a single grid can still
run narrower than the bundle it came from. The unbound bundle is unchanged — `features` stays
required, which is what every grid built from a kit package still writes.

`<DataGrid.Cell>`, `<DataGrid.Row>` and `<DataGrid.Body>` now hand back what they would have
rendered, the way `<DataGrid.HeaderCell>` always has. A cell's render function receives `content`
— its system control, open editor or cell-type view, already resolved; a row's receives its default
cells; a body's receives `content` plus the six parts it composes (`creatingRow`, `pinnedTopRows`,
`centerRows`, `pinnedBottomRows`, `loadMoreFooter`, `refetchOverlay`). Wrapping the default no
longer means reimplementing it.

One behaviour follows from this and is worth stating: a cell whose `children` are a **static** node
now opts out of cell-editing entirely — no double-click-to-edit, no editor. It could not show one
anyway, and letting it into the edit path made it take the edit state invisibly. The
render-function form is unaffected: it receives the editor as `content` and decides where to put
it.

Fixes `cellClassName` while there: it was resolved in two of the four places a `<td>` is rendered,
so a column's class never reached a system column and vanished from a cell for as long as it stayed
open for editing.

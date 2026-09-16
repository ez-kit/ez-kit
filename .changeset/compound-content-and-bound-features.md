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

**Breaking for a custom `<DataGrid.Body>`.** The loading skeleton, the empty and no-results
fallbacks and the virtualized body are now checked **before** `children`, where they used to be
checked after. Each renders a `<tbody>` of its own, so none can be handed over as content — and
while `children` came first, supplying one silently switched all four off. That was survivable
when a custom body was a rare, deliberate act; it is not, now that `content` makes "keep the
built-in body and add a row" the recommended shape. A grid that does want its own body in one of
those states turns that state off where it is configured (`fallbacks={{ loading: false }}`) and
reads the state inside `children`. Virtualization is the exception and has no opt-out: it
positions rows itself, so it owns the body, and `children` on a virtualized grid are ignored with
a development warning.

One more behaviour worth stating: a cell whose `children` are a **static** node
now opts out of cell-editing entirely — no double-click-to-edit, no editor. It could not show one
anyway, and letting it into the edit path made it take the edit state invisibly. The
render-function form is unaffected: it receives the editor as `content` and decides where to put
it.

Fixes `cellClassName` while there: it was resolved in two of the four places a `<td>` is rendered,
so a column's class never reached a system column and vanished from a cell for as long as it stayed
open for editing.

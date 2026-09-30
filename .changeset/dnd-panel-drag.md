---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Column panel drag and drop — a column moves by dragging it in the Columns panel.

The third drag surface, and the second one on the column axis. `ordering.column.visibilityMenu`
already turns the Columns toggle into a panel that lists **every** column and offers the one-step
move pair; with an adapter bound through `createDataGrid({ dnd })`, each row of that panel is now
draggable too, and the kits' panels render it with no work at the call site:

```tsx
<DataGrid.Toolbar end={<DataGrid.VisibilityTrigger />} />
```

What makes the panel a surface of its own rather than more of the header is the list its indices
count in. The header registers the **visible** leaves, so a hidden column has no place in it at all;
the panel lists the hidden ones precisely so they can be reordered, and commits under
`ColumnMoveScope.All` — the same scope its move pair already used. So a column can be dropped onto a
hidden neighbour in the panel and cannot in the header, in one grid, and both are correct.

That distinction is now in the port. `DragSpec` takes a `surface` beside its `axis`, and both
`DndDropEvent` and `DndDragOverEvent` report it, so the grid knows which list to resolve a drop's
index in and which scope to judge it under. **An adapter must partition its library's index space by
the pair, not by the axis alone** — the two surfaces' lists have different lengths, and the drag
library requires each space to be contiguous, so sharing one would silently kill dragging on both.
Both in-repo adapters now register `type` / `accept` / `group` as `<axis>:<surface>`, **and the id they
register under as `<axis>:<surface>:<id>`** — the second half being a fix rather than tidiness. dnd-kit
keys its registry by id across the whole manager, so the panel and the header, which list the same
columns, replaced each other's registration: from the first time the column panel was opened, a header
handle stopped starting a drag at all. The port's ids stay the grid's own, and an id containing the
separator survives untouched. Neither prefix is the composite group key an earlier design considered
and dropped: that one encoded a column's pin band and parent to enforce boundaries mid-drag, which
`canDrop` and the core drop helpers do instead.

**A kit writing its own adapter has to do the same.** The port hands you the axis, the surface and the
id; the library underneath almost certainly wants a unique registration per surface, and the failure if
it does not get one is silent and total.

A kit that renders its own column panel composes it from `<DataGrid.VisibilityItem>`, which is the
row element the drag moves — it carries the `column-visibility-item` slot, takes the kit's class, and
works out its own index and scope, so both stay in `@ez-kit/data-grid-react`. Also exported as
`DataGrid.VisibilityItem`.

**One obligation comes with it: render one item per column the panel lists, and each one once.** The
index a row registers is its position in that list, so a panel that renders a subset — a search box
filtering the rows, a collapsed section — leaves gaps in the index space, and a gap stops panel
dragging entirely with no error. Filter what a row _renders_, not which rows exist. Both kits simply
map `<DataGrid.VisibilityTrigger>`'s `columns`, which is that list.

Each panel grip is named for its own column — `Drag column: Salary` — because unlike the header, where
every handle sits in its own cell beside the column name, a panel is a list of otherwise identical
buttons. Both kits also style the dragged panel row the way they already styled a dragged header cell.

A grid with no adapter, or one whose panel offers no moves, renders exactly the markup it rendered
before and registers nothing. A column whose place the author fixed with `ordering: false` keeps its
index — it must, or the space has a hole and nothing commits anywhere — and offers no grip.

---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Column panel drag and drop — a column moves by dragging it in the Columns panel.

The third drag surface, and the second one on the column axis. `ordering.column.visibilityMenu`
already turns the Columns toggle into a panel that lists **every** column and offers the one-step
move pair; with an adapter bound through `createDataGrid({ dnd })`, each row of that panel is now
draggable instead, and the kits' panels render it with no work at the call site:

```tsx
<DataGrid.Toolbar end={<DataGrid.VisibilityTrigger />} />
```

**The arrows step aside for the drag, and `visibilityMenu` grew the two switches that say so.** It
now takes `boolean | { drag?: boolean; moveControls?: boolean }`, where `true` means the grip when
an adapter is bound and the arrows when none is — one affordance, never both. The pair moves a
column by the same rules as the drag, over the same state, with the same refusals, and the drag is
operable from the keyboard too, so a panel offering both offers the same move twice. Write
`{ moveControls: true }` for both, or `{ drag: false }` for the arrows alone in a grid whose rows
and headers still drag.

The **wide list** is not one of the switches: it follows from asking for an ordering panel at all,
since a list that skipped a column could not be read as the order, so it is on under either
affordance. Two combinations the grid cannot honour now warn in development instead of going quiet
— `{ drag: true }` with no adapter falls back to the arrows, and `{ moveControls: false }` with no
adapter leaves a panel that reads as the order and offers no way to change it.

**This is the only surface where that choice is an option at all, and the asymmetry is the point.**
A row drags iff a call site rendered `<RowDragHandle />` and a header iff it placed `dragHandle`, so
for those two the JSX is already the switch and an option would be the duplication this config
avoids. A kit's panel maps its rows rather than having them written, so nobody has JSX to leave
out — which is why the question lands in the config here and nowhere else. A panel that wants
something else entirely still composes it from `<DataGrid.VisibilityTrigger>`'s render function and
`<DataGrid.VisibilityItem>`.

**`VisibilityMenuProps` gains `isColumnPanel`, and a kit must branch its panel's shape on that
rather than on `col.ordering`.** The two were the same question while a panel always carried the
move pair, and are not once the pair can be absent: the HeroUI kit read "some item carries moves"
as "render the column panel", so a drag-only panel fell back to its react-aria list box — which
mounts no `<DataGridVisibilityItem>`, and therefore registered no row with the drag. The panel
looked like a plain Columns toggle and dragging was silently gone; five browser specs caught it.
`<DataGrid.VisibilityTrigger>`'s render function receives the same field. Each _control_ still
follows the item — `col.ordering` for the pair, `<ColumnDragHandle />`, which self-hides, for the
grip.

HeroUI's move pair is now absent rather than disabled when an item carries no `ordering`, matching
the shadcn kit: it used to render unconditionally with `col.ordering?.canMoveStart !== true`
covering both "this column is at the end" and "this panel has no moves", which would have left two
dead buttons beside every grip. The shadcn panel's popover takes its width from `isColumnPanel` for
the same reason — a grip needs the room the arrows used to.

What makes the panel a surface of its own rather than more of the header is the list its indices
count in. The header registers the **visible** leaves, so a hidden column has no place in it at all;
the panel lists the hidden ones precisely so they can be reordered, and commits under
`ColumnMoveScope.All` — the same scope its move pair already used. So a column can be dropped onto a
hidden neighbour in the panel and cannot in the header, in one grid, and both are correct.

That distinction is now in the port. `DragSpec` takes a `surface` beside its `axis`, and both
`DndDropEvent` and `DndDragOverEvent` report it. The pair is what an item registers under, and what
decides the scope a drop is judged and committed under; no index is resolved from it, because a drop
names the item it landed on by id. **An adapter must partition its library's index space by
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

A grid with no adapter, one whose panel offers no moves, or one whose panel takes the move pair
instead, renders exactly the markup it rendered before and registers nothing. A column whose place the author fixed with `ordering: false` keeps its
index — it must, or the space has a hole and nothing commits anywhere — and offers no grip.

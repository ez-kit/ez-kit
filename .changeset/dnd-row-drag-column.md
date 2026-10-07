---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Give the row drag handle a system column of its own, `__drag__`

With `ordering.row` on and a drag adapter bound through `createDataGrid({ dnd })`, the grid now puts
the row's grip in a `__drag__` system column: first in the row, ahead of the selection checkbox,
pinned at the start edge and fixed at `44` px. A grid with no adapter gets no such column — its rows
still move through the actions menu.

The handle used to live in a column the consumer wrote, and that column was an ordinary one: its
track was `minmax(size, 1fr)`, so it took a share of the free width like any data column, and a
`48` px drag column rendered several times as wide with the grip floating in the middle of it.

- **`ordering.row.column`** configures the column like every other system column (`width`,
  `pinning`, `align`, `header`, `headerClassName`, `cellClassName`), or turns it off with `false`
  for a grid that places `<DataGrid.RowDragHandle />` itself — in a column's `cell.component`, or
  through a row's render function.
- **`core.RowDragHandle`** is a new optional component slot: what the column and a row's
  `dragHandle` render arg place. Both kits register their own, so the grip wears the kit's glyph; a
  kit that registers none gets the shared, glyph-less handle. Additive — an external kit that wrote
  `satisfies FullGridComponents` keeps compiling.
- **`messages.ordering.columnHeader`** (`'Row order'`) names the column's header cell for assistive
  technology, rendered visually hidden like the expand and actions columns'.
- **`DRAG_COLUMN_ID`** (`'__drag__'`) and `SystemColumnType.Drag` are exported beside the other
  system column ids.

**Migrating:** a grid that already renders `<RowDragHandle />` in a column of its own now shows two
grips per row. Drop that column, or keep it and write `ordering: { row: { column: false } }`.

Both kits' drag handles also drop from a filled primary button to a quiet, icon-sized ghost: no fill
at rest, a muted glyph, and the kit's hover surface.

---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

With a drag adapter bound, the built-in header cell places a column drag handle before the label

The header now behaves the way the column panel already did. With column ordering on and an adapter
bound through `createDataGrid({ dnd })`, every movable header carries a grip, and the column menu
drops **Move left** / **Move right** — the same move one step at a time, beside a drag that is
keyboard-operable too. `Alt+Arrow` is unaffected. A header composed with `<DataGrid.HeaderCell>`
still places its grip itself, through `dragHandle` or `<ColumnDragHandle />`.

- **`ordering.column.drag`** — headers drag. Default: whether an adapter is bound. `false` keeps the
  headers still, with the menu's move pair back, in a grid whose rows or panel drag.
- **`ordering.column.moveControls`** — the column menu carries the move pair. Default: `true` exactly
  when the header drag resolves off. `true` offers both.
- **`core.ColumnDragHandle`** is a new optional component slot, the twin of `core.RowDragHandle`:
  what the built-in header cell and the `dragHandle` render arg place. Both kits register their own,
  so the grip wears the kit's glyph; a kit that registers none gets the shared, glyph-less handle.
  Additive — an external kit that wrote `satisfies FullGridComponents` keeps compiling.

**Migrating:** a grid with an adapter bound and column ordering on that composed a header cell only
to place a grip can drop the composition. One that relied on the menu's move pair writes
`ordering: { column: { moveControls: true } }`.

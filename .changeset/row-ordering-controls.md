---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

`ordering.row.controls` chooses how a row offers a move: `'drag'` a handle in the `__drag__`
column, `'step'` the _Move up_ / _Move down_ pair in the row's actions menu, `'both'`, or `false`
for neither. It takes the same `boolean | ReorderMode` values as `ordering.column.header` and
resolves them the same way, so a grid with a drag adapter can now drop the menu pair and keep
the handle: `ordering={{ row: { controls: 'drag' } }}`.

- **The default is `'both'`, so no grid changes.** A grid with an adapter keeps the handle and the
  menu pair, a grid without one keeps the menu pair. This differs from `ordering.column.header`,
  whose default `true` gives the grip alone, on purpose: the menu pair is a row's only way to move
  with a single click instead of a drag (WCAG 2.2, 2.5.7 Dragging Movements), while a column can
  also be moved from the column panel. `Alt+Arrow` does not replace it — it is a keyboard path,
  and the HeroUI kit's rows do not receive it.
- `Alt+ArrowUp` / `Alt+ArrowDown` keep working under every value, `false` included. Only
  `ordering.row` itself turns them off.
- `'step'` and `false` leave the `__drag__` column out, and rows are no longer picked up by the
  adapter. A `<DataGrid.RowDragHandle />` placed by hand under `column: false` renders nothing
  under them.
- A mode without the menu pair takes it out of the row menu, and the overflow trigger is named for
  what is left in it. When nothing is left the menu button is not drawn, and row ordering alone no
  longer mounts the actions column.
- `'drag'` or `'both'` written without an adapter falls back to the menu pair and warns in
  development, as the column surfaces do.
- `ResolvedGridOptions.ordering` gains `rowControls` — the resolved `{ drag, moveControls }` and
  the authored `mode`. `useDataGrid` resolves it, against the same adapter that decides the
  `__drag__` column, so the handle column and the menu pair cannot disagree.

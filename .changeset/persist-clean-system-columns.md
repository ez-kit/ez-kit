---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

`extractState` and `useExtractedState` no longer persist the columns the config places. The system
columns (`__drag__`, `__selection__`, `__expand__`, `__actions__`) and any column declared with
`pinning: 'start'` / `{ side }` or `visibility: false` are left out of `columnPinning`,
`columnOrder` and `columnVisibility`, and restoring puts them back. A grid nobody touched now
persists `columnPinning: { start: [], end: [] }`, and a stored value no longer changes when a
feature is switched on or off.

- A value saved before this release, with the system columns in it, restores the same view. An id
  the grid does not have, such as `__drag__` after `ordering.row` is turned off, is ignored.
- A system column the config only seeds (`pinning: { initialSide }`) is the user's to move, so it is
  still persisted.
- `onStateChange`, the per-feature `onChange` callbacks, `useDataGridState` and `table.store.state`
  are unchanged: they report the table's state as it is, system columns included.
- A controlled `state` now keeps the column rules every other write path already kept. A
  `columnPinning: { start: [], end: [] }`, a `columnVisibility` that hides `__actions__` or a
  `columnOrder` without the system columns no longer unpins, hides or reorders them. The grid
  completes the value without reporting it back through `onStateChange`, since the user changed
  nothing.
- The columns the config pins stay on the outer edge of their side. A column the user pins to the
  end now lands inside the actions column instead of beyond it. A non-empty `columnOrder` gets the
  forced start columns back at its start, through `initialState`, `table.setColumnOrder` or a
  controlled `state`, and no longer lists the forced end columns. Because they are declared last,
  they stay after every column, including one a saved order does not mention.
- New `table.grid.columnState` with `enforce(state)` and `strip(state)` — the grid's column rules,
  bound to its columns — and a `signature` that changes exactly when those rules do. Its type
  `ColumnStateApi` is exported from `@ez-kit/data-grid-core`.
  `ResolvedGridOptions` in `@ez-kit/data-grid-react` carries it as `columnState`.

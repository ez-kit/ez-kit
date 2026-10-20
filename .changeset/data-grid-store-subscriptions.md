---
'@ez-kit/data-grid-react': minor
---

Re-rendering the component that hosts `<DataGrid>` no longer re-renders every cell. The grid
rebuilt its cell-type registry on each render, and every cell reads it, so any state change in the
host reached the whole table. The registry now keeps its identity while the cell types are
unchanged. With the layout passed as `children` and `columns` / `cellTypes` hoisted, a host
re-render now reaches no cell, header cell or row.

- `useDataGridSelector`, `useDataGridState` and `useGridContext` now run on
  `@tanstack/react-store`'s `useSelector` (a new direct dependency, the same range
  `@tanstack/react-table` already pulls in) and take an optional `{ compare }`. A selector that
  builds a fresh object or array no longer loops forever; with `compare: shallow` it re-renders
  only when one of the object's fields changes. Call sites without the argument behave as before.
- `DataGridSelectorOptions` is exported. `shallow`, already exported, is the comparison to pass.
- A store held in `context` by reference is a documented pattern for values that change often:
  its subscribers re-render and the host does not. See the new **State → Rendering** docs page.
- The `useItems` source host keeps its hooks from re-running on a host re-render through element
  identity instead of `React.memo`.

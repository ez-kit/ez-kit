---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Feed a `select` / `badge` column's values from a hook. `cell.config.useItems` takes a stable hook
returning `{ items, isLoading, error }`, which the grid calls itself — once per list, not once per
cell, and only while a cell, filter, chip or editor on screen reads it (a mounted filter panel
reads every list it offers) — so a backend dictionary no
longer means rebuilding the columns on every response. The hook runs inside the grid and may read
it (`useDataGridState` for the current filters); fetching and caching stay with the hook, usually a
query library. It receives a parameters object, empty today, that later options extend.

- `filtering`, `editing` and `creating` take their own `items` / `useItems`, inherited
  `creating → editing → cell` and `filtering → cell`. An override changes what is offered; labels
  always come from the base list.
- `cell.config.getItem(row)` labels a value from the row it belongs to, before or without a list,
  and labels faceted filter values and their chips when the column has no list.
- A kit's view receives `itemStatus` (`resolved` / `pending` / `error` / `missing`) and `item`;
  `FieldState` gains `itemsLoading`, `itemsError` and `item`; `MultiSelectFilterProps` gains
  `itemsLoading` and `itemsError`. All optional, so an external kit keeps compiling. Both kits draw a
  skeleton for a pending label and loading / error states in their selects and multi-select.
- A hook that throws is caught per list and reads as that list's `error`, then is run again (up to
  three times with a growing delay, and whenever a control starts reading the list). The rerun cannot
  clear an error a query library keeps itself — TanStack Query rethrows a `throwOnError` or suspense
  error until a `QueryErrorResetBoundary` resets it — so the docs recommend returning `error`. A hook that
  suspends is waited for inside the grid while the list reads as loading. The grid stays up.
- `useItemsSource(columnId, slot)` reads a column's list through the grid's own source.
- `messages.filtering.itemsError` is the text for a list whose hook failed.
- Development builds warn when one level sets both `items` and `useItems` (the hook wins), when a
  `useItems` reference changes between renders, and when `filtering.faceted` meets
  `filtering.manual: true` (facets then count the loaded page only).
- `filtering.fields` take `filtering.useItems` (and a `select` cell's `config.useItems`).

**Behaviour fixes** to the filter's counts: a `count` an item's own source states is now kept
under `faceted` — it used to be overwritten by a count of the loaded rows — and, once anything
counts, a value nobody counted reads `count: 0` instead of `undefined`, which the kits show and keep
selectable. The active-filters chips now show a selected value's label rather than its raw value.

**Types**: a column writes the new `SelectColumnConfig` / `BadgeColumnConfig` (`items` or
`useItems`, plus `getItem`) — what `BaseCellTypes` and both kits' registries now declare as the
`select` / `badge` column config. `SelectCellConfig` / `BadgeCellConfig` stay what a component
receives, with `items` required as before. `defineCellType` takes an optional second type
parameter for a column config that differs from its renderers' one.

**Size budgets**, measured with `size-limit` (minified + brotli, dependencies ignored):
`@ez-kit/data-grid-react` `dist/index.js` went from 34.34 kB to 37.66 kB, so its budget moves from
35.5 kB to 43.5 kB. In `@ez-kit/data-grid-heroui` the new list states take `dist/cell-types/select.js`
to 1.24 kB (budget 800 B → 1.45 kB), `badge.js` to 1.37 kB (940 B → 1.6 kB) and the `cell-types`
barrel to 3.15 kB (3 kB → 3.65 kB).

---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
'@ez-kit/data-grid-shadcn': minor
---

data-grid: `selection.bar.actions` now takes the same action entries `rowActions.actions` does

**Breaking.** The selection bar's `actions` was `ReactElement | ((args) => ReactElement)` — finished
markup — while the per-row `rowActions.actions` was `(ctx) => RowActionItem[]` — data the kit
renders. Offering the same action in both places meant rewriting a description as a hand-drawn
button that never matched the kit's own Delete beside it.

- `selection.bar.actions` is now `(args) => ActionItem[]`. An entry's `icon`, `destructive` and
  `disabled` are rendered by the kit, so an action written once looks right in the row menu and in
  the bar.
- Core's `RowActionItem` is renamed `ActionItem` — it is contributed from two places now, and only
  one of them is a row. `rowActions.actions` is otherwise unchanged.
- Arbitrary markup that is not an action moves to the new `start` / `end` slots of
  `<DataGrid.SelectionBar>`, mirroring `<DataGrid.Toolbar>`: the config carries data, the compound
  component carries markup. `children` still replaces the bar wholesale.
- Kit `SelectionBarProps` gains `actions: GridMenuItem[]` (was `ReactElement`) plus `start` / `end`.

Migration: `actions: <button onClick={onExport}>Export</button>` becomes
`actions: ({ selectedRows }) => [{ id: 'export', label: 'Export', onSelect: () => onExport(selectedRows) }]`.

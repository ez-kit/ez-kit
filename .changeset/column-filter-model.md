---
'@ez-kit/data-grid-react': minor
---

**A filter panel can now be built on a kit's own filter component.**

`useColumnFilters()` — and the `<DataGrid.FilterPanel>` render function, which receives the same
thing — hands over each filterable column's **filter model** as `filter`: operators labelled from
the grid's messages, the default and current operator, the current value, the `FilterEditor` the
operator calls for (`text`, `number`, `date`, `boolean`, `select`, `between`, `multiSelect`, `none`,
`custom`), the values on offer with faceted counts, the date presets, the `between` bounds, the
debounce, and `setValue` / `nextValueForOperator`. Rebuilding that from `column.columnDef.meta` is no
longer necessary; the grid's own header and panel controls now render from the same model.

Beside the columns comes the panel's whole `value` — one `{ operator, value }` per column with
operators, keyed by column id — and a `setValue` that writes it in **one** state change, so an
Apply button fires `filtering.onChange` once rather than once per column. Empty values are dropped
rather than stored as filters, and under `draft` the write lands in the draft.

Additive: `FilterPanel`, `FilterPanelChip`, `ColumnFilter` and the existing render-function fields
are unchanged. New exports: `useColumnFilters`, `FilterEditor`, and the types `ColumnFilterModel`,
`OperatorColumnFilterModel`, `PlainColumnFilterModel`, `UseColumnFiltersResult`,
`ColumnFiltersValue`.

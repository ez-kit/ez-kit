---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Place the filter panel, and place one column's filter anywhere.

`filtering.panel` takes `'above'` (the default — its own strip between the toolbar and the table) or
`'toolbar'`, which mounts the panel's chips in the toolbar's leading slot: the faceted-toolbar
layout, from config alone. The scalar is the placement, as with `filtering.chips`.

`<DataGrid.ColumnFilter columnId='status' />` renders a single column's chip — the same control,
operator select and popover the panel builds — wherever a layout wants it, with a render-prop over
the same per-column shape. Until now the only way to reach one column's control was to take
`<FilterPanel>`'s whole column list and filter it down to one.

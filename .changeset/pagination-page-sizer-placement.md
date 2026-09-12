---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Say where the page-size selector goes: `pagination.pageSizer` replaces `pagination.toolbar`, taking
`true` / `'toolbar'` / `'footer'` / `{ placement }`. `'footer'` mounts the control in the pagination
row, to the leading edge with the page controls at the trailing one — the layout most shadcn-style
tables use. The default is unchanged (`'toolbar'`, mounted as soon as `pagination.items` is set), and
so is `false`, which mounts nothing while leaving `items` for a hand-placed `<DataGrid.PageSizer />`.

The option is named for the control rather than for a container because it now has two homes:
`toolbar: true, placement: 'footer'` would be a config contradicting itself. The features whose
control can only live in the toolbar keep the `toolbar` flag. The resolved option follows suit —
`grid.pagination.pageSizer` is `{ placement } | undefined` instead of a boolean.

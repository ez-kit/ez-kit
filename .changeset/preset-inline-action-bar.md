---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

**Breaking: the layout presets put an `inline` action bar above the table.**

With `selection: { bar: 'inline' }`, `DefaultLayout`, `BottomBarLayout`, `FilterPanelLayout` and
`PopoverFiltersLayout` now render the action bar between the toolbar and the table. In
`FilterPanelLayout` it goes after the active-filters strip, directly above the table. Before, every
preset rendered the bar last, so an inline bar sat below the pagination, away from the rows it acts
on. The `floating` bar, which is the default, still renders last. Every kit's prebuilt `DataGrid`
binds `DefaultLayout`, so it changes too.

Each preset still renders exactly one bar. When a controlled `selection.bar` switches variant, the
bar moves without losing the selection. A grid whose body is `children` or its own `core.Layout`
is unaffected: the bar stays where that layout writes it.

The inline bar renders nothing until a row is selected or a draft is pending, so above the table it
now pushes the rows down when it appears. To keep it below the table, write a layout of your own with the bar last:

```tsx
<DataGrid selection={{ bar: 'inline' }}>
	<DataGrid.Toolbar />
	<DataGrid.Table />
	<DataGrid.Pagination />
	<DataGrid.ActionBar />
</DataGrid>
```

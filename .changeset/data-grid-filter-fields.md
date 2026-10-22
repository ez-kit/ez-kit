---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

Filter a server query by fields that are not columns. `filtering.fields` declares them in the
column's vocabulary — `id`, `header`, `cell`, `filtering` — and every filter surface offers them
after the filterable columns: `<DataGrid.FilterPanel />`, `<DataGrid.Filter id>`, `useFilters()`
and the active-filters strip. A field's value lives in `columnFilters` under its `id`, so
`filtering.onChange`, `draft` and a restored state see columns and fields in one array. Fields are
offered only under `filtering.manual: true` (development builds warn otherwise), and a field id that
repeats a column id — system columns included — or another field's id throws when the table is
created.

**Breaking** (`@ez-kit/data-grid-react`): the filter API now speaks of filter targets rather than
columns. The renames are mechanical:

| Before                                                                                                  | After                                                                            |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `useColumnFilters()`                                                                                    | `useFilters()`                                                                   |
| `({ columns })` in `<DataGrid.FilterPanel>`                                                             | `({ filters })`                                                                  |
| `entry.column`                                                                                          | `entry.source.kind === 'column' ? entry.source.column : …`                       |
| `filter.columnId`                                                                                       | `filter.id`                                                                      |
| `<DataGrid.ColumnFilter columnId='x'>`, `DataGridColumnFilter`                                          | `<DataGrid.Filter id='x'>`, `DataGridFilter`                                     |
| `DataGridFilterPanelColumn`, `ColumnFilterModel`, `OperatorColumnFilterModel`, `PlainColumnFilterModel` | `DataGridFilterTarget`, `FilterModel`, `OperatorFilterModel`, `PlainFilterModel` |
| `ColumnFiltersValue`, `UseColumnFiltersResult`, `DataGridColumnFilterProps`                             | `FiltersValue`, `UseFiltersResult`, `DataGridFilterProps`                        |

The `columnFilters` state slice, `filtering.onChange` and the kit slot props (`FilterPanel`,
`FilterPanelChip`, `FilterChip`) are unchanged.

---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

Export the types every documented signature already names.

`selection.onChange` is typed `(rowSelection: RowSelectionState, …)`, `pinning.column.onChange`
takes a `ColumnPinningState`, `visibility.onChange` a `VisibilityState` — and none of the six
TanStack slice types were re-exported, so lifting a handler out of the JSX meant adding
`@tanstack/table-core` as a second dependency, which is precisely what this package and every kit
built on it promise you never need. `RowSelectionState`, `ExpandedState`, `ColumnPinningState`,
`RowPinningState`, `ColumnSizingState` and `VisibilityState` now sit beside `ColumnFiltersState`
and `PaginationState`.

`CreatingApi`, `EditingApi` and the new `DeletingApi` / `BulkDeletingApi` are exported too, so a
helper that takes `table.creating` can name its parameter.

The Core (advanced) docs page claimed core exported eight state types plus `FilterFn` and
`CellTypeDefinition`. Nine of the ten did not exist there; the table now says what core actually
has and where the rest live.

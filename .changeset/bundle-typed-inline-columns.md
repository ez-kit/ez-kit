---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

**Breaking (types only).** Inline columns are now checked against the grid's cell-type registry.
The `DataGrid` and `useDataGrid` a `createDataGrid` bundle returns — and the prebuilt ones each kit
exports — type `columns` with the bundle's registry, widened by the ids that grid's own `cellTypes`
prop adds. An unknown `cell.type`, a missing required `cell.config` and a config key the type does
not declare are compile errors where they used to render the raw value silently. The row type is
still inferred from `data`. Runtime behaviour is unchanged, and the `DataGrid` / `useDataGrid`
imported straight from `@ez-kit/data-grid-react` stay unchecked, since their registry arrives
through a provider.

Code that now fails to compile passes the grid columns of a type it does not register:

- a type registered on one grid only — pass it through that grid's `cellTypes` and write the
  columns inline beside it, or register it in the bundle;
- columns built with another bundle's `createColumns`, or typed `ColumnDef<Row, any>` /
  `UseDataGridConfig['columns']` — build them with this bundle's `createColumns` /
  `createColumnHelper`.

`BoundDataGridProps`, `BoundUseDataGridConfig` and `BoundDataGrid` take the registry as a new
trailing type parameter that defaults to accepting any `cell`, so a wrapper written as
`BoundDataGridProps<F, Row>` keeps compiling. The bundle types need TypeScript 5.4 or later.

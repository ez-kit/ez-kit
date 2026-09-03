---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Public API audit: fix two runtime breaks, make the compound components actually composable, and
settle the naming conventions before 1.0. Contains breaking changes.

**Fixed**

- `createDataGrid` no longer drops compound members. The factory copied them by hand and had
  fallen five behind, while `as typeof DataGrid` typed them as present — so `<DataGrid.SelectionBar />`,
  `.DraftBar`, `.SortTrigger`, `.GlobalFilterInput` and `.ColumnVisibilityTrigger` from a kit were
  `undefined` at runtime with no compile error.
- `rowActions.variant` is usable. It was a TS `enum`, so the documented `variant: 'menu'` did not
  compile, and the enum was not exported from the adapter or the kits — leaving no way to write
  the value at all.
- `column.filtering: false` now sets `enableColumnFilter: false`, so `column.getCanFilter()` agrees
  with the config. It previously reached only `meta`, and any consumer-built control reading the
  TanStack API saw the wrong answer.

**Breaking**

- Closed sets are `const` objects plus same-named string unions instead of `enum`s
  (`RowActionsVariant`, `RowActionsMode`, `RowActionId`, `GridFeature`, `GridMenuIcon`,
  `GridMenuVariant`, `ColumnActionId`, `BetweenBranch`). `X.Member` still works as a value and `X`
  still works as a type; a bare string is now assignable too. `PaginationVariants` is renamed to
  `PaginationVariant` for the same shape.
- `variant` now always means presentation and `mode` always means behaviour:
  `creating.mode` → `creating.variant`, `editing.mode` → `editing.variant`,
  `expanding.variant` → `expanding.mode` (`ExpandingVariant` → `ExpandingMode`).
- Raw TanStack pass-throughs are gone from `ColumnDef` — each duplicated an ez-kit alias:
  `enableColumnFilter` → `filtering: false`, `enableGlobalFilter` → `globalFilter: false`,
  `enableHiding` → `visibility: true`, `enableResizing` → the new `resizing: false`.
- `sorting.toolbar` moved from the headless `SortingConfig` to `ReactSortingConfig`, joining
  `globalFiltering.toolbar` and `columnVisibility.toolbar` in the layer that reads it.
- `TableConfig.columnVisibility` is `boolean` rather than `boolean | object`, which had let any
  misspelled key through unchecked.
- The internal `Symbol()` keys (`SORTING_KEY`, `VIRTUALIZED_KEY`, `FALLBACKS_KEY`, …) are no longer
  exported. They carry normalized config on the table instance and were never usable API.
- Under an options provider, `feature: true` at a call site no longer wipes a defaulted config
  object. Both spellings mean "enabled", so the config survives; `false` still turns it off.

**Added**

- `<DataGrid.Table>` and `<DataGrid.Body>` accept `children`, as nodes or a render function over
  the live table. The compound members were exported but not composable — `Table` rendered its own
  header and body, `Body` its own rows, and neither took props.
- `<DataGrid.Toolbar>` accepts `left` / `right`, which append to the auto-mounted controls instead
  of replacing them. Previously `children` was the only hatch and it replaced the whole bar.
- `<DataGrid.Header />` resolves `stickyHeader` from the grid option, so it works placed by hand.
- `column.header` / `column.footer` accept a render function. The renderer path always worked via
  `flexRender`; only the `string` type forbade it.
- The adapter re-exports the whole of `@ez-kit/data-grid-core`, and the shadcn / heroui kits
  re-export the whole adapter. ~50 core types — `CellType`, `ColumnSortingConfig`, `RowActionsConfig`,
  `LoadingState`, `ACTIONS_COLUMN_ID` and more — were unreachable from a kit, which forced a second
  direct dependency just to name a type.
- New docs page: **Composition**.

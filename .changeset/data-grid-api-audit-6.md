---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Close eight defects the sixth API audit turned up.

**`selection.column` sees the real row type.** `ReactSelectionConfig` was declared as
`SelectionConfig & { bar }`, dropping the type argument, so a replacement select-all header was
handed `HeaderContext<object>` and `row.original.name` did not compile. `expanding.column` and
`rowActions.column` had always passed it.

**One node vocabulary across the three system columns.** `RowActionsConfig` spent a single type
parameter on two unrelated things — a menu entry's `icon`, which needs an element, and
`column.header`, which is column-header content and must accept a string like any other header.
It is now `RowActionsConfig<TRow, TIcon, TNode>`, with `TIcon` in the position the old single
parameter held, and `SelectionConfig` / `ExpandingConfig` gained the same `TNode`. Under React
all three now type `column.header` as `ReactNode`, where selection and expanding previously
checked nothing at all and row actions rejected `() => 'Actions'`.

**Delete prompts see the row.** `ConfirmationConfig` / `BulkConfirmationConfig` are generic over
the row type, so ``description: (row) => `Delete "${row.original.name}"?` `` needs no cast — the
casts are gone from the docs examples.

**Compound render arguments can be typed.** `<DataGrid.Body>`, `Table`, `Header`, `HeaderRow`,
`HeaderCell`, `Row`, `Cell` and `Footer` take an optional row type argument —
`<DataGrid.Body<Order>>` — and their `*Props` / `*RenderArgs` types are generic to match. The
default is unchanged, so nothing has to be updated.

**`<DataGrid.FooterRow>` and `<DataGrid.FooterCell>`.** The footer had no per-row or per-cell
slot, so changing one footer cell meant hand-writing a `<td>` and re-deriving `colSpan`, the
pinning offset, `align.footer` and `footerClassName`. These are the footer's counterparts to
`HeaderRow` / `HeaderCell`, and the default footer is now built from them.

**`SystemColumnDef.footerClassName`.** The three system columns could set `align.footer` but not
the class beside it, though the default `<tfoot>` renders a cell for every column.

**`ColumnMeta.filtering` carries the whole feature.** The resolved filtering config was five flat
keys next to it — `filteringItems`, `facetedEnabled`, `defaultOperatorId`, `resolvedOperators`,
`betweenOperatorConfig` — so `filtering.items` was read back as `meta.filteringItems`. They are
now `meta.filtering.items` / `.faceted` / `.defaultOperator` / `.operators` / `.betweenOperator`,
each named for the column option it holds, typed as the new `ColumnFilteringMeta`.

**Docs: column and row pinning do have an `onChange`.** Both pages stated they do not, while
`pinning.column.onChange` and `pinning.row.onChange` are wired and fire.

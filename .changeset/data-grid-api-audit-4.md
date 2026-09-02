---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Close the gaps a fourth pass over the public API turned up. Breaking, and pre-1.0, so it ships
as a minor.

**A column's input slots now hand you a typed `config`.** `filtering.component` and
`editing.component` / `creating.component` always received the column's `cell.config`, but the
slot's type rejected the annotation that would name it — so reading `config.items` on a `select`
column meant a cast. The slots are declared through the new `ColumnInputRenderer`, whose props
compare bivariantly, so `(props: InputComponentProps<SelectCellConfig>) => …` is accepted.
`FieldState` also gained a `TValue` parameter, bound from the column's `accessorKey`: an edit
field on a `number` column sees `value: number`.

**One name per prop shape.** `CellInputProps` is gone. It was exported, documented as the type a
registered cell type's `filter` slot receives, and used by nothing — those slots take
`FieldState`. A column's own `filtering.component` keeps the smaller `InputComponentProps`.

**Renames, one concept one word:**

- `Toolbar.left` / `Toolbar.right` → `Toolbar.start` / `Toolbar.end`. The bar is a flex row, so
  the slots swap sides under RTL; `align`'s logical vocabulary applies, `pinning`'s physical one
  does not.
- `editing.validateDebounceMs` / `creating.validateDebounceMs` → `debounce`, at both the table
  and the column level, matching `filtering.debounce` and `globalFiltering.debounce`.
- `pagination.pageSizeOptions` → `pagination.items` — the word this API already spends on "the
  values a control offers", and the name of the `PageSizerProps.items` it feeds.
- `LoadMoreRowProps.hasMore` and `InfiniteController.hasMore` → `hasNextPage`, matching the
  `pagination.hasNextPage` option they carry.
- `ClearFiltersButtonComponentProps` → `ClearFiltersButtonProps`, matching every other kit
  contract.
- `<DataGrid.SortTrigger>` → `<DataGrid.SortMenuTrigger>` (with `DataGridSortMenuTriggerProps` /
  `…RenderArgs`). It mounts the kit's `SortMenu`; the name now matches both that and the
  `data-slot="sort-menu-trigger"` the kits already emit, and no longer collides with the header's
  per-column `data-slot="sort-trigger"`.
- `resizing.direction` → the root `direction` option, with `ColumnResizeDirection` renamed
  `GridDirection`. Text direction is a fact about the grid, not a resize setting, and it now
  applies whether or not resizing is enabled.

**`enabled` reaches nested configs.** `pinning.column`, `pinning.row`, `virtualization.row`,
`deleting.confirmation`, `deleting.bulk.confirmation`, `selection.bar`, `filtering.chips`,
`filtering.toolbar` and the three `fallbacks.*` entries all take the shared feature toggle, so a
config that arrived from a defaults layer can be switched off for one grid without restating it.

**`filtering.chips` takes the scalar form** — `chips: 'below'` alongside the object, the same
shape as a column's `align`, `width` and `pinning`.

**`DATA_GRID_DEFAULTS` is complete.** It now carries every default value under its option path —
sorting, selection, expanding, resizing, virtualization, row actions, editing, creating, layout,
the `link` cell target and the grid direction — with the core-owned numbers re-exported from
`@ez-kit/data-grid-core` (`DEFAULT_VALIDATE_DEBOUNCE_MS`, `DEFAULT_ROW_ESTIMATE_SIZE`,
`DEFAULT_ROW_OVERSCAN`) rather than restated. The docs' "Default Values" page matches it.

**`data-slot` on the fallback rows.** `EmptyStateRow` and `NoResultsRow` rendered
`<Tbody><Tr><Td>` with no slot at all, so the structural stylesheet's rules applied to the
loading body and not to them; both now mirror `LoadingBody`. The kits' `Pagination` and
`PageSizer` gained `data-slot` too.

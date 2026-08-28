---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

**Breaking:** one word per concept across the option surface.

**"Supply your own renderer" is `component`.** Five column slots already said `component`;
`expanding.renderExpanded` and `fallbacks.{loading,empty,noResults}.content` said two other
things. They are now `expanding.component` and `fallbacks.*.component`.

**"The values this column can take" is `items`.** `cell.config.items` (select, badge) and
`filtering.options` were the same list under two names on the same column — and `options` is the
word this config already spends on everything you configure. `column.filtering.options` is now
`column.filtering.items`, the kit prop `MultiSelectFilterProps.options` is `items`, and
`MultiSelectOption` is `FilterItem` (`SelectItem` plus the faceted `count`).

**Bounds are `min` / `max`.** `DateCellConfig.minValue` / `maxValue` — React-Aria's vocabulary,
sitting next to `ProgressCellConfig.max` and `ColumnWidthDef.min` / `max` — are now `min` / `max`.

**`aria-label` is `aria-label`.** `ClearFiltersButtonComponentProps` and the
`<DataGrid.ClearFiltersButton>` prop spelled it `ariaLabel` while `GridMenuProps` and `ButtonProps`
used the React spelling. Now all of them use `'aria-label'`.

**`ActionsCellProps` carries a `state`, not a `mode`.** `RowActionsMode` named a row's current
state, not what the feature does, and collided in autocomplete with `RowActionsVariant` two lines
away. It is `ActionsCellState`, and the prop is `state`.

**`selection.bar.onClear` is `selection.bar.clear`.** Every other `on*` in this API notifies; this
one _replaces_ the bar's clear behaviour. The name now says so.

**Type-name suffixes.** `ConfirmationOptions` → `ConfirmationConfig`, `BulkConfirmationOptions` →
`BulkConfirmationConfig`, `RowVirtualOptions` → `RowVirtualizationConfig`,
`ColumnPinningFeatureConfig` → `ColumnPinningConfig`, `VisibilityUIConfig` →
`ReactVisibilityConfig` (matching `ReactSortingConfig` and the rest).

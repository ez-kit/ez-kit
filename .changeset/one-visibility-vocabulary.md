---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

**Breaking:** the visibility and fallback features are spelled one way, not two.

The config option was renamed `columnVisibility → visibility` in the previous release, but the
UI-kit contract kept the old vocabulary: a kit author wrote `visibility: true` and then looked for
`visibility` in `FullGridComponents`, where the tier was `'column-visibility'`. Same for
`fallbacks`, whose tier was `'fallback-states'`.

| before                             | after                        |
| ---------------------------------- | ---------------------------- |
| `GridFeature.ColumnVisibility`     | `GridFeature.Visibility`     |
| tier key `'column-visibility'`     | `'visibility'`               |
| `GridColumnVisibilityComponents`   | `GridVisibilityComponents`   |
| `ColumnVisibilityMenu` slot        | `VisibilityMenu`             |
| `ColumnVisibilityMenuProps`        | `VisibilityMenuProps`        |
| `DataGrid.ColumnVisibilityTrigger` | `DataGrid.VisibilityTrigger` |
| `GridFeature.FallbackStates`       | `GridFeature.Fallbacks`      |
| tier key `'fallback-states'`       | `'fallbacks'`                |
| `GridFallbackStateComponents`      | `GridFallbackComponents`     |

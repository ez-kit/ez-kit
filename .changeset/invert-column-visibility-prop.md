---
'@ez-kit/data-grid-core': minor
---

Invert the custom column `visibility` prop semantics. The prop is now `visibility?: true | ColumnVisibilityDef`: `visibility: true` marks the column as always visible / locked (cannot be hidden — no Hide option in its menu and absent from the Columns toggle), replacing the previous `visibility: false`. The object form `{ defaultHidden: true }` is unchanged (a column that starts hidden but can be toggled on). This is a breaking change — replace any `visibility: false` with `visibility: true`.

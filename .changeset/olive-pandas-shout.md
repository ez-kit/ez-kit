---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Merge row pinning into the row actions column and add `rowActions.variant`

**Breaking:** the `__row_pin__` system column is gone. Its menu now lives in the
`__actions__` column beside edit and delete, so enabling `pinning.row` alone is
enough to get that column. `ROW_PIN_COLUMN_ID` and `ROW_PINNING_KEY` are no longer
exported.

The actions column also carries an explicit width derived from the number of actions
it renders. It previously had none and fell back to TanStack's 150px default — wide
enough to leave a visibly empty column next to one icon button.

**New:** `rowActions: { variant: 'inline' | 'menu' }`. `inline` (default) renders one
icon button per action side by side; `menu` collapses them into a single overflow
menu. Save / cancel stay inline while a row is in inline edit mode either way.

**Kit contract:** the `pinning` component group is replaced by `row-actions`, which
owns `ActionsCell` (moved out of `editing`) and the new item-driven `RowActionsMenu`
(replacing `RowPinMenu`). Kits register `'row-actions': { ActionsCell, RowActionsMenu }`.

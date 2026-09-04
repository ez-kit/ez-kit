---
'@ez-kit/data-grid-shadcn': patch
'@ez-kit/data-grid-heroui': patch
---

Render `ClearFiltersButton`'s own children as its label. Both kits hardcoded the `FilterX` icon and
dropped the `children` the React layer passes them, so `<DataGrid.ClearFiltersButton>Reset</DataGrid.ClearFiltersButton>`
rendered an icon-only square instead of "Reset". Children now replace the icon and the button stops
being icon-only when they are present; without children nothing changes.

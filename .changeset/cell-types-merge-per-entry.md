---
'@ez-kit/data-grid-react': minor
---

`cellTypes` layers entry by entry instead of replacing whole cell types.

Every registry merge in the package was a shallow spread over ids — `<DataGrid cellTypes>`,
`extendDataGrid`, and nested `<CellTypesProvider>` alike. Naming an id the kit had already
registered therefore replaced the entire definition, which is almost never what the call reads
as: `cellTypes={{ date: { view: MyDate } }}` looks like "keep the kit's date cell, swap its
view" and instead dropped its `edit`, `filter` and the config the type declared.

The same defect made `baseCellTypes` a trap. Six of its nine entries carry only a config
declaration — they exist so kits can spread them — so passing `baseCellTypes` straight to a grid
blanked out every renderer the kit had registered, and six of the nine advertised cell types
silently rendered nothing. Nothing caught it: the ids all type-check.

All three sites now merge per entry, so keys the override omits keep the base's value. Full
replacement is still available by spelling the whole definition out. Nested providers gain the
same behaviour, which is what their documented "override a kit cell type for a subtree" was
already claiming to do.

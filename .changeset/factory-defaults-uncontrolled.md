---
'@ez-kit/data-grid-react': patch
---

fix: factory `defaults` now reach the inline `<DataGrid data columns />` too

`createDataGrid({ defaults })` bound its option layer to the returned `useDataGrid` only, so a
kit's defaults — a translated `messages` dictionary, most visibly — applied to
`<DataGrid table={useDataGrid(…)} />` but not to the uncontrolled form, which runs the hook
inside the component where no argument can reach it. The bound `DataGrid` now publishes the
factory layer to its subtree and the hook picks it up. Precedence is unchanged: factory
`defaults` < `DataGridOptionsProvider` < the grid's own props.

Note this changes runtime behaviour for a kit that ships `defaults`: options that previously
only reached grids built with the kit's `useDataGrid` now also reach inline ones. Neither kit in
this repo passes `defaults`, so nothing here moves. The layer stops at the grid it configures — a
grid nested among another grid's children no longer sees it.

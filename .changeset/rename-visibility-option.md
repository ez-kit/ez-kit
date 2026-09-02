---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

**Breaking:** the table-level column-hiding option is renamed `columnVisibility` → `visibility`, so
it matches its column-level counterpart. It was the only feature option whose table-level and
column-level names differed, which meant autocompleting `visibility` on the grid config found
nothing. There is no compat alias — the old name is gone.

```diff
  <DataGrid
    data={data}
    columns={columns}
-   columnVisibility={{ toolbar: true }}
+   visibility={{ toolbar: true }}
  />
```

Types renamed to match: `ColumnVisibilityConfig` → `VisibilityConfig` (`@ez-kit/data-grid-core`),
`ColumnVisibilityUIConfig` → `VisibilityUIConfig` (`@ez-kit/data-grid-react`). The resolved-options
field `grid.columnVisibility` is now `grid.visibility`.

The TanStack **state** slice is unaffected: `state.columnVisibility`,
`initialState.columnVisibility` and `onStateChange`'s `columnVisibility` key keep their names, as do
`DataGrid.ColumnVisibilityTrigger` and the kits' `ColumnVisibilityMenu` component contract.

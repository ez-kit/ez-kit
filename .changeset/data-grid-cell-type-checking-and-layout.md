---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Make `cell.type` actually type-checked, group the layout options, and rename `virtualized`.
Breaking, pre-1.0 so shipped as a minor.

**`cell.type` is checked against the kit's registry again.** The `TCustom` parameter on `CellDef`
was decorative: two independent defects cancelled it out. `CellType` carries a `(string & {})`
tail, and `SimpleType` was derived from it with `Exclude`, which does not remove that tail — so
`BasicCellDef` accepted every string no matter what was registered. On top of that both kits
exported their registry as `export const cellTypes: CellTypeRegistry`, whose widening annotation
collapsed the key union to `string`, so the bound `createColumns` was typed
`ColumnDef<TRow, string>`. A typo like `cell: { type: 'raiting' }` compiled cleanly in every kit.

`BuiltInCellType` (new, exported) is now the closed union and `SimpleType` derives from it;
`CellType = BuiltInCellType | (string & {})` stays for `ColumnMeta`, where looseness is correct.
Both kits export their registry with `satisfies`.

Migration: a `cell.type` that no kit registers is now a compile error. Columns written inline into
`useDataGrid({ columns })` are unaffected (`TableConfig.columns` is `ColumnDef<TRow, string>`).
For the unbound `createColumns`, which cannot know a registry supplied at runtime through the
`cellTypes` prop, name the types you mean: `createColumns<Row, 'money' | 'rating'>([…])`.

**`stickyHeader` → `layout`.** The one presentational flag sitting among the feature toggles now
lives in its own group, together with a `maxHeight` that had no API at all: it writes
`--dg-table-max-height`, or `--dg-virtual-height` under virtualization, both of which previously
had to be set on a parent element by hand.

```diff
-useDataGrid({ data, columns, stickyHeader: true })
+useDataGrid({ data, columns, layout: { stickyHeader: true, maxHeight: '32rem' } })
```

`<DataGrid.Header stickyHeader>` is unchanged — it still overrides the grid option for one header.

**`virtualized` → `virtualization`**, so it reads as a noun beside `pagination` / `selection` /
`filtering`. `VirtualizedConfig` → `VirtualizationConfig`, `NormalizedVirtualizedConfig` →
`NormalizedVirtualizationConfig`, `ResolvedGridOptions.virtualized` → `.virtualization`.

**`initialState.pagination` seeds per key.** It is typed `Partial<PaginationState>` instead of
TanStack's both-keys-required `PaginationState`, and merges into the resolved slice rather than
replacing it. Seeding a deep link with `{ pagination: { pageIndex: 3 } }` no longer forces the
caller to restate a `pageSize` it has no opinion about — and restating it wrong no longer silently
overrode `pagination.pageSize`.

**Fixed:** `createColumnHelper().date()` / `.image()` / `.progress()` and the registered-type
helpers built `{ config: undefined }`, which is invalid under `exactOptionalPropertyTypes`. It
only ever compiled because the over-wide `BasicCellDef` absorbed the shape.

---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Remove `extendDataGrid`

Registering a custom cell type is now the `cellTypes` argument to `createDataGrid` and nothing
else. `extendDataGrid` re-invoked that same factory with the same `components`, `features` and
`defaults` while merging its argument into the registry — sugar for one call, on the one path the
docs do not recommend.

```diff
-import { extendDataGrid } from '@ez-kit/data-grid-heroui'
+import { allDataGridFeatures } from '@ez-kit/data-grid-core/features/all'
+import { allComponents, cellTypes } from '@ez-kit/data-grid-heroui'
+import { createDataGrid } from '@ez-kit/data-grid-react'

-export const { DataGrid, createColumns } = extendDataGrid({ rating: ratingCellType })
+export const { DataGrid, createColumns } = createDataGrid({
+	components: allComponents,
+	cellTypes: { ...cellTypes, rating: ratingCellType },
+	features: allDataGridFeatures,
+})
```

The replacement gives up nothing in typing: `createColumns` off the hand-built bundle rejects an
unregistered `type`, and checks a custom type's `config`, exactly as the extended bundle did —
verified against the built `.d.ts` rather than the source tree, which is where that guarantee had
been lost before. What it costs is three imports, and what it buys is that the two other axes are
visible at the same call: naming only the component groups and features a grid renders is where
the bundle saving actually lives, and `extendDataGrid` could express neither.

A project that already builds its own bundle never needed it — the custom type is a key in the
`cellTypes` literal it is already writing. A project on the kit root's prebuilt `DataGrid` writes
the three aggregates above, which is that same grid with a wider registry.

`DataGridBundle` loses the member, so an external kit that names the type sheds a field it did not
implement. The shadcn registry item drops the export too; a consumer who ran `shadcn add` before
this owns that file and keeps whatever they have until they re-run it.

---
'@ez-kit/data-grid-core': minor
---

**Breaking:** `createColumnHelper` now spells every column slot the way `ColumnDef` spells it.

`col.custom()` used to re-declare three slots under names of its own — `view` for
`cell.component`, and bare-function `editing` / `creating` for `editing.component` /
`creating.component`. The bare functions were typed as `InputComponentProps`
(`{ value, onChange }`) while a full `FieldState` is what actually arrives at runtime, so a
custom editor could not read its own `error` / `errors` / `isValidating` without a cast, and
`editing.description` could not be set through the helper at all.

In the same pass, **every** generated method now accepts `cell.component`. A built-in cell type
and a view renderer of your own were previously mutually exclusive: `col.number()` had a typed
`config` but no renderer slot, `col.custom({ type: 'number', view })` had the renderer but
degraded `config` to `Record<string, unknown>`.

```diff
- createColumn.custom({
-   accessorKey: 'rating',
-   type: 'number',
-   view: StarRatingView,
-   editing: ({ value, onChange }) => <StarInput value={value} onChange={onChange} />,
- })
+ createColumn.number({
+   accessorKey: 'rating',
+   config: { decimals: 2 },              // now typed, alongside the renderer
+   cell: { component: StarRatingView },
+   editing: {
+     description: 'Between 1 and 5',      // now reachable
+     component: ({ value, onChange, error }) => (
+       <StarInput value={value} onChange={onChange} error={error} />
+     ),
+   },
+ })
```

`col.custom()` remains the escape hatch for a cell type registered at render time via
`<DataGrid cellTypes={…}>`: its `type` / `config` stay deliberately loose. Everything else on it
is now the plain `ColumnDef` shape.

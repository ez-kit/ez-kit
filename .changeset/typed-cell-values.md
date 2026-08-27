---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

A column's cell value is typed from its `accessorKey`.

It used to be `unknown` everywhere, on every column, even one whose `accessorKey` named a
`number` field — and there was no route in the public API to a typed value. The documentation
worked around its own API: `cellClassName`'s JSDoc example was written `Number(value) < 0`
because `value < 0` did not compile.

Now it does:

```ts
// on a row of { total: number }
{ accessorKey: 'total', cellClassName: ({ value }) => (value < 0 ? 'text-red-600' : undefined) }
```

The value reaches all three slots that carry one — `cell.component`, `cellClassName` and
`creating.defaultValue`. Seeding a `boolean` column with `creating: { defaultValue: 'yes' }` is
now a compile error rather than a runtime surprise.

`ColumnDef` is a union with one member per field of the row, so TypeScript picks the member from
the literal `accessorKey`. `useDataGrid({ data, columns })` still infers the row type from `data`
alone, inline column arrays included — no new type parameter was added, and none is needed at a
call site.

**Computed columns.** A column that derives its value with `accessorFn` instead of naming a
field still gets `value: unknown` when written as a plain object — a union member has no
inference variable to bind that function's return type to. The column helper's new generic
`computed` method does, and infers the value type from the function you pass:

```ts
const col = createColumnHelper<Order>()

col.computed({
	id: 'total',
	accessorFn: (row) => row.price * row.qty, // value: number
	cellClassName: ({ value }) => (value > 1000 ? 'font-semibold' : undefined),
})
```

It requires an `id`, since a column with no `accessorKey` has nothing else to derive one from.

### Migrating

Code that worked around the old `unknown` needs the workaround removed:

- **Explicit `unknown` annotations must go.** `({ value }: { value: unknown }) => …` on a
  `cellClassName` or `cell.component` is now a type error, because the parameter is no longer
  `unknown`. Drop the annotation and let it be inferred.
- **Casts and coercions are now unnecessary.** `Number(value)`, `String(value)` and
  `value as number` still compile on an `accessorKey` column, but they no longer do anything;
  `@typescript-eslint/no-unnecessary-type-conversion` will flag them.

Neither applies to cell-type renderers registered through `cellTypes`, or to the
`<DataGrid.Cell>` render slot. Those render whichever column they are given, so their value is
genuinely erased and stays `unknown`.

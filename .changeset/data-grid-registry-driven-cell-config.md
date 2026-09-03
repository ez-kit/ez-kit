---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Type `cell.config` from the cell-type registry, so a kit-bound `createColumns` actually checks it.

**The defect.** `CellDef` was a hand-written union of seven arms plus an open `custom` arm for project-registered types. The moment a kit registered a type under an id the union already had — which every kit does, since they all register `text`, `number`, `select`, … — the open arm swallowed it. The result was that the _unbound_ core helper checked cell configs strictly while the kit-bound one, the one every consumer actually calls, checked nothing:

```ts
// @ez-kit/data-grid-core — rejected, correctly
createColumns<Row>([{ accessorKey: 'status', cell: { type: 'select' } }])
//                                                  ^ Property 'config' is missing

// @ez-kit/data-grid-shadcn — the same code, silently accepted
createColumns<Row>([{ accessorKey: 'status', cell: { type: 'select' } }])
createColumns<Row>([{ accessorKey: 'qty', cell: { type: 'number', config: { anyTypoAtAll: 1 } } }])
```

**The fix.** A cell type now declares the config it accepts, and the column type is derived from the registry rather than restating it:

```ts
export const cellTypes = {
	rating: defineCellType<{ max: number }>()({ view: RatingView, edit: RatingInput }),
}
```

`config` is then **required** on that type's columns when its config has a required field, **optional** when every field is optional, and **rejected** when the type declared no config — all derived, none of it written twice. Custom types get exactly the checking the shipped ones get, which is the reverse of the old behaviour: built-ins were checked and a project's own types were not.

**Breaking changes**

- `ColumnDef`, `CellDef`, `ColumnHelper`, `createColumns` and `createColumnHelper` take a **registry** as their cell-type parameter instead of a union of ids. `createColumns<Row, 'rating'>` becomes `createColumns<Row, typeof myCellTypes>`; a registry key union cannot carry each type's config, which is the whole point.
- `createColumnHelper`'s runtime argument is the registry's ids (unchanged in shape). Omitted, it still yields the shipped contract's builders — `createColumnHelper<Employee>()` keeps answering to `.text()` / `.select()` / `.badge()`.
- The builder now offers **exactly** the registered ids. Passing your own ids no longer also grants the built-in methods; spread `baseCellTypes` into your registry to keep them.
- Cell types must be declared with `defineCellType` for their config to be recorded. A bare object literal still works as a registry, it simply declares no config.
- `createColumnHelper(...).custom({ type, config })` stays the deliberately unchecked escape hatch for a type registered at render time via `<DataGrid cellTypes={…}>`.

**New exports** — `defineCellType` and `CellTypeRegistry` from `@ez-kit/data-grid-react`; `baseCellTypes` from `@ez-kit/data-grid-react/cell-types`; `BaseCellTypes`, `BASE_CELL_TYPE_IDS`, `CellTypeRegistryShape`, `ConfigOf`, and the `TextCellConfig` / `NumberCellConfig` / `BooleanCellConfig` declarations from `@ez-kit/data-grid-core`.

`@ez-kit/data-grid-shadcn`'s `src/index.test.ts` locks the behaviour with `@ts-expect-error` assertions, so a regression fails `pnpm typecheck` rather than passing silently.

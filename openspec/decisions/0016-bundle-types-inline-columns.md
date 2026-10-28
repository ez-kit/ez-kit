# 0016. A bundle types its columns with its own registry

- Status: Accepted
- Recorded: 2026-10-27
- Related: [0003-consumer-composed-features](./0003-consumer-composed-features.md)

## Decision

**The `DataGrid` and `useDataGrid` a `createDataGrid` bundle returns — the kits' prebuilt ones
included — check `columns` against the bundle's cell-type registry, widened only by the grid's own
`cellTypes`.** The slot is `ColumnDef<TRow, TCellTypes & NoInfer<TExtra>>[]` beside
`cellTypes?: TExtra`, `TExtra` defaulting to the empty registry. `TCellTypes` is fixed by the bundle
type, never inferred at the call site, so `TRow` is still inferred from `data`. `NoInfer` is not
optional: it is what keeps a column from registering its own `cell.type` by naming it. Core's
`TableConfig.columns` and the bare `DataGrid` / `useDataGrid` of `@ez-kit/data-grid-react` stay
unchecked — their registry comes from a provider at runtime. The public bundle types
(`BoundDataGridProps`, `BoundDataGrid`, …) take the registry as a trailing parameter defaulting to
`UncheckedCellTypes`, so a wrapper that does not know its registry keeps compiling. The change is
type-only: an id nobody registered still renders the raw value.

## Context, rationale and rejected alternatives

Inline columns used to compile with any `cell.type` and any `cell.config`; a typo rendered the raw
value with no error. `TableConfig.columns`' docblock justified that: a second type parameter on
`TableConfig` would destroy `TRow` inference. That holds for a parameter the call site has to
**infer**. A bundle already carries `TCellTypes` — `DataGridBundle` handed it to `createColumns`
and nowhere else — so the parameter is known, not inferred, and `TRow` inference is untouched.

**A second inferred parameter on `TableConfig` — rejected**, for the reason the old docblock gives.
**Checking only in the builders (the status quo) — rejected**: the inline form is the one the docs
show first, and it was the unchecked one. **An ESLint rule — rejected**: it cannot see the registry.

**Without `TExtra` — rejected.** The documented way to add a type to one grid is the `cellTypes`
prop; fixing the registry to the bundle's alone would make that path a compile error.

**`TCellTypes & TExtra` without `NoInfer` — rejected.** TypeScript then infers `TExtra` from the
columns as well as from `cellTypes`, and an inline `type: 'nosuch'` registers itself and compiles.
`NoInfer` needs TypeScript 5.4; the package README states it.

**`BaseCellTypes` as the default of the new public type parameter — rejected.** It would break a
third-party wrapper written as `BoundDataGridProps<F, Row>` that forwards to a grid whose registry
it does not know — the docs app's kit switcher, `apps/docs/shared/DataGrid.tsx`, is one.

**Columns are typed with core's `ColumnDef` (node type `unknown`), not the React one.** Columns
built with core's own `createColumns` have `header` returning `unknown`, and the React
`ColumnDef`'s `ReactNode` rejects them — the same reason `TableConfig.columns` uses `unknown`.

Known consequences. A grid's `cellTypes` entry for an id the bundle already has intersects with
the bundle's definition: a view-only override changes nothing a column writes, a definition with
its own config makes columns satisfy both configs. An explicit row type argument
(`useDataGrid<Row>(…)`) leaves `TExtra` at its default — TypeScript has no partial type-argument
inference — so per-grid widening needs the row type inferred from `data`. Columns typed
`ColumnDef<Row, any>` — for instance annotated as the bare `UseDataGridConfig['columns']` — are
rejected by a bundle grid, since an `any` registry makes `cell.type` any string. Build them with
the bundle's builder.

The type-check cost was measured with `tsc --extendedDiagnostics --incremental false` on
`apps/docs` before and after; the change stayed inside run-to-run noise. Repeat that command to
re-measure. Guards: `packages/data-grid/react/react/src/create-data-grid-columns.test.tsx` (one
case per scenario of the change's spec) and the prebuilt-grid cases in
`packages/data-grid/react/heroui/src/data-grid.test.tsx`.

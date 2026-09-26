# Data grid: server-side grouping and aggregation

**Date:** 2026-09-25
**Status:** design agreed; implementation plan at
`docs/superpowers/plans/2026-09-25-data-grid-server-side-aggregation.md`
**Builds on:** `2026-09-24-data-grid-row-grouping-design.md`, whose config surface is still
unreleased — the two grouping changesets are pending in `.changeset/`, so everything this spec
changes about `grouping` is edited in place rather than shipped as a break.

**Blocks on:** that work landing. It is uncommitted on `chore/heroui-3.2` at the time of writing,
and every file in §6 is a file it touches.

---

## 1. Summary

Today both halves of aggregation are computed on the client, and there is no way to hand the grid
a number the server already calculated. This spec adds that path, in two places:

- **Grand total** — the footer cell of a totalled column. One value per column, dataset-wide.
- **Group subtotal** — the value an aggregated cell renders on a group row.

The second requires the server to have grouped the rows as well, and that is where the work
actually is: `grouping.manual` exists today and **does not work**, for a reason this spec fixes at
the root rather than patching.

### User story

> As a developer whose grid is paginated and filtered on the server, I want the footer to show the
> total across the whole result set rather than across the page I happen to be looking at — and
> when the server also groups the rows, I want each group's subtotal to be the number it computed.

### Complexity

**Medium.** One new module in core (the manual row model), one new table-level config key, one
branch in the footer cell, one deletion. No change to the component contract, no new `data-slot`,
no kit changes.

---

## 2. What is broken today, and why

`grouping.manual: true` maps to upstream's `manualGrouping: true`
(`create-table-options.ts:1105`). That option makes `table.getGroupedRowModel()` return
`getPreGroupedRowModel()` unchanged (`coreRowModelsFeature.utils.js:76`).

Every part of group-row behaviour in v9 keys on a property that only the grouped row model sets:

```js
function row_getIsGrouped(row) {
	return !!row.groupingColumnId
}
```

`constructRow` does not set it; `createGroupedRowModel` does, in an `Object.assign` alongside
`groupingValue`, `subRows` and `leafRows`. So under `manualGrouping` every row answers
`getIsGrouped() === false` and `cell.getIsAggregated() === false`, and the grid renders:

- the `__group__` column injected (it is gated on grouping being enabled,
  `system-columns.ts:174`) and **empty on every row**;
- the grouped user column **missing** (removed off `state.grouping`, which `by` fills in manual
  mode too);
- no subtotals anywhere.

The only test covering the mode asserts that the row count is unchanged
(`grouping.test.ts:248`), which is true and says nothing about any of the above.

The footer's grand total has a quieter defect. `footerContentOf` calls
`column.getAggregationValue?.()` (`footer-cell.tsx:77`), which aggregates
`table.getPreGroupedRowModel()`. Under `filtering.manual` or `pagination.manual` that model holds
whatever the server returned, so the number is the **page** total while reading as the dataset
total. Nothing warns.

### What upstream already provides

All of it is public API on `@tanstack/table-core@9.2.4` — verified against its `dist/index.d.ts`
export list:

- `constructRow`, `tableMemo`, `makeObjectMap`, `hasOwn`, `flattenBy` — everything
  `createGroupedRowModel` is built from, so an alternative row model is writable without reaching
  into internals.
- `columnDef.getAggregationValue({ column, rows, maxDepth, table })` returning `{ value }`, and
  `options.manualAggregation` — the upstream escape hatches for a supplied total. **Neither is
  used by this design**; §3.6 says why.

---

## 3. Decisions

### 3.1 Both response shapes are supported

**Tree.** A group row is an object with children and its own aggregate fields:

```json
{ "id": "region:EMEA", "region": "EMEA", "revenue": 110000,
  "subRows": [ { "id": "1", "account": "Acme", "revenue": 50000 }, … ] }
```

**Flat.** One sequence, each row carrying its level:

```json
[
	{ "id": "g:EMEA", "level": 0, "region": "EMEA", "revenue": 110000 },
	{ "id": "1", "level": 1, "account": "Acme", "region": "EMEA", "revenue": 50000 }
]
```

Tree is the canonical contract and costs the least; flat is what SQL backends produce from
`GROUPING SETS` / `ROLLUP` and needs the grid to build the hierarchy.

### 3.2 The mode is selected by the row model, not by a flag

`grouping.manual: boolean` is **deleted**. Server grouping is stated by handing the table a
different grouped row model:

```ts
const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnGroupingFeature,
	groupedRowModel: createManualGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})
```

This is the v9 model — a table has only the features it was handed — and it removes the class of
bug the flag had: a flag that claims a behaviour the registered model does not implement. There is
nothing left to contradict.

The asymmetry with `sorting.manual` / `filtering.manual` / `pagination.manual` is deliberate and
worth stating, because a reader will notice it. On those three axes `manual` means _do not run the
model you were given_ — a switch on an existing model. Here it means _build rows a different way_,
which in v9 is a different model. Upstream's own `manualGrouping` took the flag route and that is
precisely what produces the broken grid in §2.

**`createManualGroupedRowModel()` stays out of `allDataGridFeatures`.** Two models cannot occupy
one slot, and the all-in set is the client one. A kit's prebuilt `DataGrid` therefore cannot do
server grouping, which is correct and already expressible: a set named at a call site replaces the
bound one, so `<DataGrid features={serverSet} …>` is the path.

### 3.3 One model serves both shapes

The factory takes the flat-shape adapters; their absence means tree:

```ts
createManualGroupedRowModel<Deal>({
	isGroupRow: (row) => row.level === 0,
	getLevel: (row) => row.level,
})
```

**`getSubRows` is the exception and lives on the config**, not on the factory:

```ts
grouping={{ by: ['region'], getSubRows: (row) => row.subRows }}
```

That asymmetry is forced by the pipeline rather than chosen. The tree has to exist in the **core**
row model, which is built before any grouped model runs, so reading children is a `TableOptions`
concern — it is upstream's `getSubRows` option. The flat adapters are consumed by our model
itself, which never sees our config object (row models receive `table`, and the resolved config
lives on the React adapter's `table.grid`). Putting `getSubRows` on the factory would mean
threading it back out into a table option, which is the same thing with an extra hop.

Note it must be `grouping.getSubRows` and not the existing `expanding.getSubRows`: the latter is
wired only under `expanding.mode: 'tree'` (`create-table-options.ts:1088`) and writing `expanding`
injects the `__expand__` column (`system-columns.ts:159`, gated on the config), so a server-grouped
grid would grow a second chevron column it does not want.

### 3.4 Group subtotals need no option at all

In both shapes the group row carries its aggregates as ordinary fields, so the default accessor
already returns them. The manual model's whole job for subtotals is **not to compute**: it sets
`groupingColumnId` / `groupingValue` / `leafRows` and leaves `getValue` alone, where upstream's
model overrides it with an aggregating one.

Everything downstream then works unchanged, which is the entire argument for §3.2: our
`AggregatedCell`, the `__group__` label (`row.groupingValue`, `cell.tsx:375`), the row count
(`row.getLeafRows().length`, `cell.tsx:373`), expansion, and the selection cascade.

**With one exception, found while planning and worth stating precisely.** Upstream's
`cell.getIsAggregated()` is gated on a _resolvable aggregation function_ — `cell_getIsAggregated`
ends in `column_getAggregationFns(column).some((e) => !!e.aggregationFn)` — and a server-grouped
column has no `fn`, which is the whole point. So that method answers `false`, the cell falls
through to the ordinary view branch, and the group row shows the server's value formatted by the
column's cell type. The _value_ is right; what silently goes missing is `aggregation.component` and
the `data-aggregated-cell` attribute both kits can style. So `cell.tsx` widens its own branch: a
cell is aggregated if upstream says so **or** if it sits on a group row, its column is not the
grouped one, and it has a value. That reads `row.getIsGrouped()`, which is not a second notion of a
group row — the manual model sets `groupingColumnId`, so the method is authoritative in both
modes.

A server that names a subtotal differently from the column's accessor (`revenueSum` under a
`revenue` column) is **not** supported. The fix is on the server, or an `accessorFn` column.

### 3.5 Grand totals are a new table-level `aggregation` config

```tsx
aggregation={{ manual: true, totals: res.totals }}   // { revenue: 232000 }
```

`aggregation` exists today only as a column option; this adds the table-level key. `totals` is
keyed by column id and is **grand totals only** — subtotals come from the row, per §3.4.

`manual` is explicit rather than inferred from `totals`, because the valuable statement is
"compute nothing": under it a totalled column with no entry in `totals` renders an **empty**
footer instead of a page-scoped number. `totals` without `manual` stays legal and means "use these,
compute the rest", which is the mixed grid — client data plus one total the client should not
recompute.

`totals` is the name because the docs already call the footer value a grand total and the group
value a subtotal; the plural is over columns, not over kinds.

**No `FeatureToggle` on this config.** Every sibling config has `enabled`, and here it would lie:
the table-level key governs server totals, while what a reader would expect `aggregation.enabled:
false` to turn off is every column's aggregate, including the subtotals that come from row fields
and owe nothing to this config. Left out until something needs it.

### 3.6 A column needs no `aggregation` to show a supplied total

If `totals[column.id]` is present, the footer renders it — whether or not the column wrote
`aggregation`. Consequences, both intended:

- A grid whose totals all come from the server registers **neither** `rowAggregationFeature` nor
  `aggregationFns` and pays for neither. A supplied total is served from the config, so
  `column.getAggregationValue()` is never reached for that column — it remains the path for a
  column the client still computes (§5, branch 4). Group subtotals need no feature either, but
  only because of the `cell.tsx` branch in §3.4: without it the renderer would be skipped.
- `ColumnAggregationConfig.fn` becomes **optional**, since in this mode the only reason to write
  `aggregation` at all is `component` — a renderer for the supplied value. An object with neither
  `fn` nor `component` is meaningless and warns.
- The feature-requirement detection in `create-table-options.ts` moves from "a column wrote
  `aggregation`" to "a column wrote `aggregation.fn`" (`aggregatedColumns`, ~line 703).

### 3.7 Rejected alternatives

- **Per-column `aggregation.total`.** Columns are declared once at module scope — every example in
  the docs calls `createColumns` outside the component — while a total changes with each response.
  It would force columns to be built inside render and memoised. Server data already lives in the
  config (`data`, `pagination.rowCount`); the total belongs beside it.
- **Passing `columnDef.getAggregationValue` through.** Same module-scope problem, plus a callback
  where a value suffices, plus it re-exposes upstream vocabulary this config otherwise renames.
- **Upstream `options.manualAggregation`.** It only suppresses computation; it supplies nothing, so
  we would still need `totals`. One switch is better than two, and ours is the one that can also
  name the missing column in a warning.
- **Keeping `manualGrouping: true` and teaching our React layer a second notion of "group row".**
  Cheaper in core, and wrong: it duplicates the concept across `cell.tsx`, `row.tsx`,
  `actions-cell.tsx` and the footer, leaves `cell.getIsAggregated()` false so aggregated-cell
  rendering needs a parallel path, and never gets `leafRows` — so the group row count and the
  selection cascade stay broken.

---

## 4. Config surface

```ts
// core/src/types.ts
export type GroupingConfig<TFeatures, TRow, TNode> = FeatureToggle & {
	by?: string[]
	mode?: GroupingMode
	column?: SystemColumnDef<TFeatures, TRow, TNode>
	/** Reads a group row's children. Writing it says the data arrives as a tree. */
	getSubRows?: (row: TRow, index: number) => TRow[] | undefined
	onChange?: (grouping: string[]) => void
	// `manual?: boolean` — REMOVED, see §3.2
}

export type AggregationConfig = {
	/** Never compute a total on the client. A column with no entry in `totals` renders empty. */
	manual?: boolean
	/** Grand total per column id. Subtotals come from the group row's own fields. */
	totals?: Record<string, unknown>
}

export type TableConfig<…> = {
	// …
	aggregation?: AggregationConfig
}

// core/src/column/types.ts
export type ColumnAggregationConfig<TNode = unknown> = {
	fn?: BuiltInAggregationFn | (string & {}) | AggregationFnDef<…>   // was required
	component?: TNode
}
```

```ts
// core/src/features/grouping/create-manual-grouped-row-model.ts
export function createManualGroupedRowModel<TRow extends object>(adapters?: {
	isGroupRow?: (row: TRow) => boolean
	getLevel?: (row: TRow) => number
}): /* the groupedRowModel slot's factory type */
```

Interactive regrouping is unchanged: the group-by bar and the column menu write `state.grouping`
and fire `grouping.onChange`, and the consumer refetches. `by` stays meaningful in manual mode —
it is how the grid knows how many top levels are group rows and which column each level belongs
to, for the `__group__` label and for hiding the grouped column.

---

## 5. Architecture

### The manual grouped row model

Mirrors `createGroupedRowModel`'s outer shape — a `tableMemo` over
`[table.atoms.grouping?.get(), table.getPreGroupedRowModel(), table.options.columns]` — and
replaces the body.

**Tree mode.** The core row model has already built the hierarchy from `grouping.getSubRows`, so
the model walks it and _decorates_ rather than constructs. For each row at `depth < by.length`
that has children:

```ts
Object.assign(row, {
	groupingColumnId: by[row.depth],
	groupingValue: row.getValue(by[row.depth]),
	leafRows: flattenBy(row.subRows, (r) => r.subRows),
})
```

`getValue` is deliberately untouched (§3.4). Rows deeper than `by.length`, and childless rows at
any depth, are records and are left alone. Mutating rows from the pre-grouped model matches what
upstream does in `resetRowRelationships`, and is the reason this is a row model rather than
something in our React layer.

**Flat mode.** `isGroupRow` and `getLevel` first fold the sequence into a hierarchy — a level
strictly greater than the previous row's opens a child list, an equal or smaller one closes back to
that depth — setting `subRows`, `parentId` and `depth`; then the same decoration runs. A row whose
level jumps by more than one past its predecessor is a hole in the response: it **throws** in
development and is attached at the nearest legal depth in production.

### The footer

`footerContentOf` (`react/react/src/data-grid/footer-cell.tsx`) gains one branch ahead of the
`getAggregationValue` call, reading the resolved `aggregation` config:

1. `column.columnDef.footer` — unchanged, still wins over everything.
2. `totals?.[column.id]` — render it.
3. `manual` — render nothing.
4. Otherwise `column.getAggregationValue?.()`, exactly as today.

`ResolvedGridOptions` (`react/react/src/resolved-options.ts`) grows
`aggregation: { manual: boolean; totals: Record<string, unknown> | undefined }`.

### Development warnings

In `create-table-options.ts`, beside the existing `REQUIRED_FEATURE` catalogue:

- `aggregation.manual` with a column that wrote `aggregation.fn` and no matching entry in
  `totals` — names the column.
- `totals` naming a column id no column has.
- `aggregation` written as `{}` on a column — neither `fn` nor `component`.
- `grouping.getSubRows` written while the registered grouped row model is the client one, and the
  converse: a set carrying `createManualGroupedRowModel()` with neither `getSubRows` nor flat
  adapters. Both are runtime-only, like every feature guard in this config
  (`types.ts` on `TableConfig.features`).

---

## 6. Files to change

**`packages/data-grid/core`**

- `src/features/grouping/create-manual-grouped-row-model.ts` — new.
- `src/features/entry.ts` — re-export it; keep it out of `features/all.ts`.
- `src/types.ts` — `AggregationConfig`, `TableConfig.aggregation`, `GroupingConfig.getSubRows`,
  delete `GroupingConfig.manual`.
- `src/column/types.ts` — `ColumnAggregationConfig.fn` optional.
- `src/create-table/create-table-options.ts` — drop the `manualGrouping` mapping, wire
  `getSubRows` from `grouping`, move the aggregation feature detection to `aggregation.fn`, add
  the warnings.

**`packages/data-grid/react/react`**

- `src/resolved-options.ts` — the new resolved `aggregation`.
- `src/use-data-grid.ts` — fill it on the per-render `grid` object.
- `src/data-grid/footer-cell.tsx` — the supplied-total branch.
- `src/data-grid/cell.tsx` — the aggregated-cell branch of §3.4.

**`apps/docs`**

- `content/docs/data-grid/grouping/aggregation.mdx` — a server-totals section and its option
  table; the page currently states the client-only behaviour as if it were the only one.
- `content/docs/data-grid/grouping/index.mdx` — replace the `grouping.manual` row.
- A new example under `shared/data-grid/examples/components/grouping/`, registered in
  `manifest.json` **and** `registry.ts`.
- `test/docs-options/page-type-map.ts` — the new and changed option tables, with counts.
- `test/example-features/sets.ts` — the new example's required features.
- `test/tree-shaking.test.ts` — a case pinning that importing `createManualGroupedRowModel` does
  not reach the client grouped model.

**Changesets.** Edit `.changeset/data-grid-row-grouping-config.md` and `-render.md` in place — the
surface they describe has not shipped, so `grouping.manual` never existed publicly and its removal
is not a break. The new `aggregation` config is a minor on `@ez-kit/data-grid-core` and
`@ez-kit/data-grid-react`. Never name `@ez-kit/data-grid-shadcn` (`check-changesets.mjs`).

---

## 7. Not building

- **Lazy group children** — expand a group, fetch its rows. A different feature (it needs a
  per-row loading state and a request keyed by group path) and the design here does not block it.
- **A server "Total" row** as a pinned row. The footer is where a grand total goes.
- **Multiple aggregates per column** (upstream's array `aggregationFn` with `merge`) and
  `maxAggregationDepth`. Both are upstream capabilities we do not expose today, and neither is
  needed for this.
- **A per-column mapping from a differently-named server field** — §3.4.

---

## 8. Repository guards that will fail if skipped

- `docs-option-names.test.ts` resolves every documented option name against the real exported
  types and fails on an unmapped page or a drifted count. Every new option (`aggregation.manual`,
  `aggregation.totals`, `grouping.getSubRows`) and the removed `grouping.manual` must be reflected
  in `page-type-map.ts`.
- `tree-shaking.test.ts` records the **complete** set of entry points an import reaches, so the
  new export needs its own case.
- `size-limit` budgets on both packages.
- `check-changesets.mjs` runs first in `pnpm lint`.
- `check-site-url.mjs` — no `ez-kit*` origin in new prose.
- `feature-optionality.test.tsx` renders a grid missing each optional feature; a footer that now
  reads the config instead of the feature must still not throw without `rowAggregationFeature`.

---

## 9. Testing

**core — the manual model**

- tree: a group row gets `groupingColumnId`, `groupingValue` and a `leafRows` count; its
  `getValue` for a totalled column returns the row's own field, not a computed sum;
- tree: a row deeper than `by.length` is a record, and so is a childless row at depth 0;
- tree: two levels — `by: ['region', 'manager']`;
- flat: the same assertions after folding; a level jump throws in development;
- neither model computes anything: a group row whose field is absent reads `undefined`, not 0.

**core — the aggregation config**

- `manual` suppresses the client total for a column with `aggregation.fn`;
- `totals` without `manual` overrides one column and leaves another computed;
- each warning fires once, and none fires on a clean config.

**react**

- the footer renders `totals[id]` through the column's cell-type view, and through
  `aggregation.component` when there is one;
- `column.footer` still wins over a supplied total;
- under `manual` a totalled column with no entry renders empty;
- **a new `totals` with an unchanged `data` array repaints the footer** — the regression §10 names;
- a server-grouped grid renders group labels, counts and subtotals with no `rowAggregationFeature`
  in the set.

**e2e** — none new. No slot is added, so `e2e-slots.test.ts` has nothing to reconcile.

---

## 10. Risks

- **`ResolvedGridOptions` is read from a ref and never subscribes** (`use-grid-options.ts:16`).
  Narrower than it first looks: the object is **rebuilt every render**
  (`use-data-grid.ts:1303`), so any render that reaches the footer sees the current totals, and a
  new response re-renders the consumer by construction. What is not covered is a footer kept from
  re-rendering by memoisation above it. Pinned by the test above rather than engineered around.
- **Row mutation in the model.** It is what upstream does and what keeps every downstream read
  working, but it violates the repo's immutability default and needs a docblock saying so, or a
  reviewer will file it.
- **Flat-mode hole handling** is the only place this design invents behaviour rather than mirroring
  upstream. Throwing in development and repairing in production is the choice; it is a guess about
  which failure a consumer would rather have.
- **Pagination still counts group rows** (documented upstream behaviour). With server grouping the
  server decides what a page contains, so a page can end mid-group and the grid cannot help. Say
  so on the page.

---

## 11. References

- `node_modules/@tanstack/table-core/dist/features/column-grouping/createGroupedRowModel.js` —
  the model this one mirrors.
- `…/features/row-aggregation/rowAggregationFeature.utils.js` — `column_getAggregationValue`,
  `cell_getIsAggregated`, and upstream's own supplied-value hooks.
- `…/core/row-models/coreRowModelsFeature.utils.js:76` — what `manualGrouping` actually does.
- `packages/data-grid/react/react/src/data-grid/footer-cell.tsx:48-90` — the grand-total path.
- `packages/data-grid/react/react/src/data-grid/cell.tsx:340-400` — what a group cell reads.
- `docs/superpowers/specs/2026-09-24-data-grid-row-grouping-design.md` — the client design.

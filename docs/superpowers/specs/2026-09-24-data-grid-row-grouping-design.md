# Data grid: row grouping + aggregation

**Date:** 2026-09-24
**Status:** design agreed, not implemented
**Blocks on:** the accessibility branch currently in flight (`chore/heroui-3.2`) — see §9.

---

## 1. Summary

Rows collapse into synthetic **group rows** keyed by the value of one or more columns, and columns
carry **aggregates** that render on those group rows and, independently, as a grand total in the
footer. Grouping and aggregation are two separate features, exactly as TanStack Table v9 splits
them, and either works without the other.

This is the last feature on the roadmap that a data grid is normally expected to have before 1.0,
and the last one with any chance of forcing a change to the component contract after 1.0. The
design below reaches zero contract change, which is what makes it safe to ship either side of the
major.

### User story

> As a developer building an operational screen, I want rows grouped by a column with subtotals
> under their own columns, so that a reader sees structure and magnitude without leaving the grid —
> and as that screen's user, I want to regroup it myself without a code change.

### Complexity

**Large.** ~25–30 files across four packages plus the docs app. But much smaller than a feature of
this name usually is, because the engine already ships — see §2.

---

## 2. What already exists

This is the single most important fact for sizing the work. `columnGroupingFeature`,
`rowAggregationFeature`, `createGroupedRowModel` and `aggregationFns` are **stock TanStack v9
features, already re-exported** from `@ez-kit/data-grid-core/features` and already members of
`allDataGridFeatures`:

- `packages/data-grid/core/src/features/entry.ts:31,38` — the two features
- `packages/data-grid/core/src/features/entry.ts:87` — `createGroupedRowModel`
- `packages/data-grid/core/src/features/entry.ts:77` — `aggregationFns`
- `packages/data-grid/core/src/features/all.ts` — all four in the all-in set

What is missing is not the engine. It is the **config surface that reaches it**, and the codebase
says so in two places, in prose, deliberately:

`packages/data-grid/core/src/features/entry.ts:56-63`

```
 * `aggregationFns` it cannot see, and this is a property of the config rather than an omission:
 * `TableConfig` has no `grouping` option and `ColumnDef` no `aggregationFn`, so nothing a consumer
 * writes reaches `createTable` asking for an aggregation. … A guard would have no condition to
 * test until grouping gains a config key.
```

`packages/data-grid/core/src/create-table/create-table-options.ts:256-262` carries the mirror note:
"If grouping ever gains a config key, this is the shape its guard takes."

Both docblocks, and the `constructTable`-based test at
`packages/data-grid/core/src/features/entry.test.ts:209-229` that exists only because there is no
config surface, become false the moment this ships. Updating them is a task, not an afterthought.

So the work is: **config surface, rendering, controls, docs, guards** — not grouping logic.

---

## 3. Decisions

Each of these was argued and settled. Re-proposing one needs new evidence, not a new argument.

### 3.1 Two features, not one

`columnGroupingFeature` + `groupedRowModel` build row structure. `rowAggregationFeature` +
`aggregationFns` compute values. Upstream's own guidance is explicit that registering
`columnGroupingFeature` merely to total a column is a mistake: `column.getAggregationValue()` gives
a grand total over the filtered row model with no grouping at all.

This maps cleanly onto this repo's composition doctrine: a grid that wants footer totals and no
grouping must not pay for `createGroupedRowModel()`.

Grouping additionally requires **expansion** — a group row is a row with `subRows`, and it is
`rowExpandingFeature` + `expandedRowModel` that open it. That is a hard requirement, not a
preference, and it is what the `REQUIRED_BY_OPTION` entry in §8 encodes.

### 3.2 Authored **and** interactive

`grouping.by` seeds the grouping an author wants; `enableGrouping` decides whether the user may
change it. Both, not either.

### 3.3 A synthetic `__group__` system column — not TanStack's native staircase

TanStack's own model renders the group label **in the grouped column itself**, with
`groupedColumnMode: 'reorder'` moving that column to the front. With one grouping level this reads
fine. With two or more, labels descend diagonally across two or more of the user's own data
columns, and those columns stand empty on every leaf row because their cells are placeholders.

Both commercial grids rejected this and inject a synthetic column instead:

| Shape                            | AG Grid `groupDisplayType` | MUI X `rowGroupingColumnMode` |
| -------------------------------- | -------------------------- | ----------------------------- |
| one column, all levels, indented | `singleColumn` (default)   | `'single'` (default)          |
| one column per level             | `multipleColumns`          | `'multiple'`                  |
| full-width banner row            | `groupRows`                | —                             |

- https://www.ag-grid.com/react-data-grid/grouping-display-types/
- https://mui.com/x/react-data-grid/row-grouping/

We follow them. A fourth system column `__group__` joins `__selection__`, `__expand__` and
`__actions__`, configured through the existing `SystemColumnDef` vocabulary as
`grouping.column` — which is exactly the settled rule in `AGENTS.md`: "The three system columns are
configured like columns."

Consequences, all of them good:

- The chevron lives **inside** `__group__`, so `__expand__` is untouched and grouping coexists with
  `expanding` in either mode with no branching: a group row's chevron opens its children, a leaf
  row's opens its detail panel, both through one `row.toggleExpanded()`.
- `groupedColumnMode: 'remove'` — the source column disappears while it is grouped, because its
  value is already the label. This is AG Grid's default behaviour too.
- Indentation is already solved: both kits style `tr[data-depth='N'] [data-system-column='expand']`
  for N = 1..5 (`shadcn/src/styles.css:304-333`, `heroui/src/styles.css:337-366`) and `data-depth`
  is written by the shared package at `react/react/src/data-grid/row.tsx:219`. The selectors need
  generalising to match `[data-system-column='group']` as well; the mechanism is untouched.

One reviewer raised whether grouping should instead ride in `__actions__` the way pinning and
ordering do, with no column of its own. It cannot: those two contribute _menu items_, whereas
grouping must render a _label, a count and a chevron per group row_. There is nowhere to put that
but a cell.

### 3.4 `mode: 'single' | 'multiple'`, default `'single'`

`'single'` holds every level in one column and shows nesting by indentation; `'multiple'` gives
each level its own column. The default is `'single'` because grouping here is interactive: under
`'multiple'` the column set changes shape every time the user adds or drops a level, and the layout
jumps.

`'banner'` (AG Grid's `groupRows`) is **not** in scope and is not foreclosed — it is a pure render
variant and can join the union later without touching the model.

### 3.5 Zero contract change — no new component slot at all

This is stronger than the "optional-tier `GroupCell`" the discussion initially settled on, and it
was forced by a real constraint: `contract.test.ts:70-74` asserts that **no required feature group
is empty**, so a new `GridFeature.Grouping` carrying only optional members would fail that test,
and adding a required member is precisely the major-version break this whole design exists to
avoid.

So v1 adds **nothing** to `FEATURE_COMPONENTS` and **nothing** to `FEATURE_OPTIONAL_COMPONENTS`:

- the group cell is composed in the shared react package from `core.Td`, the existing
  `expanding.Chevron`, and plain text, and is targeted by kits through
  `data-slot='group-cell'` + `data-system-column='group'`;
- an aggregate cell renders through the column's **existing** cell-type `view` renderer, or through
  `column.aggregation.component` when the author supplies one;
- the footer's grand-total row composes from `DataGrid.FooterRow` / `DataGrid.FooterCell`, which
  already exist as compound members;
- `GroupByBar` renders from `core.Button` and `core.Menu`. This is not an improvisation —
  `AGENTS.md` names the group-by picker explicitly as a `core.Menu` case, beside the density picker.

If a kit later needs to own group-cell rendering, `GroupCell` joins the **optional** tier then, in
its own feature group with at least one required member, or under `core`. Additive, a minor, and a
decision that costs nothing to defer.

**Cost of being wrong here is asymmetric** — that is why the conservative option won. A slot added
later is a minor; a slot added now and regretted is a major.

### 3.6 Controls: column menu + a composed bar

- **Column menu**: `Group by this column` / `Ungroup`, as new members of the closed sets
  `ColumnActionId` (`react/react/src/data-grid/column-menu-sections.ts`), `GridMenuIcon`
  (`core/src/menu-icon/menu-icon.ts`) and the `messages.columnMenu.*` keys. Same shape as the
  `pin-start` / `pin-end` precedent.
- **`<DataGrid.GroupByBar />`**: chips for the active levels, each removable, with move-up /
  move-down to reorder nesting. Modelled line-for-line on
  `react/react/src/data-grid/active-filters-bar.tsx`: a plain `<div data-slot=… data-…=…>`, no
  authored class, state read through referentially-stable selectors, `null` when there is nothing
  to show.
- Mounted by **composition**, never by an option:
  `<DataGrid.Toolbar start={<DataGrid.GroupByBar />} />`. `AGENTS.md`: "The config states
  behaviour; JSX states composition. There are no placement options."
- **Not in scope**: dragging a column into a grouping drop zone. That is a special case of column
  drag-reorder, which does not exist yet, and it becomes cheap once it does.

### 3.7 Feature interactions

| Feature                          | Behaviour                                                                                                | Note                                                                                                                                                                                                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Selection                        | **Cascade.** A group row's checkbox selects every leaf row under it; partial selection is indeterminate. | `enableSubRowSelection`, `row.getIsAllSubRowsSelected()`                                                                                                                                                                                                                 |
| Pagination                       | A page counts **rendered** rows, group rows included, so a page may end mid-group.                       | Upstream behaviour; AG Grid and MUI X do the same. Documented, not worked around.                                                                                                                                                                                        |
| Sorting                          | Applies within groups; group rows order by grouping value.                                               | Upstream default, untouched.                                                                                                                                                                                                                                             |
| Editing / deleting / row actions | Not offered on a group row — it is not a record.                                                         | Needs an explicit guard, or `ActionsCell` renders on a synthetic row.                                                                                                                                                                                                    |
| Row ordering                     | Move controls are not offered while grouping is non-empty.                                               | Row order is determined by grouping; "move up one" is meaningless.                                                                                                                                                                                                       |
| Row virtualization               | Unchanged.                                                                                               | A group row is a row.                                                                                                                                                                                                                                                    |
| Column pinning / visibility      | `__group__` pins and is configured like the other three system columns.                                  | Through `SystemColumnDef`.                                                                                                                                                                                                                                               |
| Filtering                        | Runs before grouping; groups recompute.                                                                  | Upstream pipeline: filter → group → sort → expand → paginate.                                                                                                                                                                                                            |
| Grouped headers                  | Impossible in the heroui kit.                                                                            | React Aria dropped nested-column support before GA (`adobe/react-spectrum#5537`); `heroui/src/blocks/core/table-adapters.tsx:78-99` flattens them. Irrelevant to this design, which puts nothing in the header — recorded so nobody proposes a group-summary header row. |

### 3.8 Four cell modes, handled separately

Every cell of a group row is one of four things, and conflating them is the defect upstream's own
guidance leads with:

```ts
cell.getIsGrouped() // the grouping column's cell → label + count + chevron
cell.getIsAggregated() // a column with an aggregation → the aggregate value
cell.getIsPlaceholder() // anything else on a group row → render null
/* otherwise */ // an ordinary leaf cell
```

A placeholder that renders its value shows an arbitrary row's datum as if it described the group.

---

## 4. Config surface

Table level, beside the existing feature options at `core/src/types.ts:871-905`:

```ts
grouping?: boolean | GroupingConfig<TFeatures, TRow>

export type GroupingConfig<TFeatures, TRow, TNode = unknown> = FeatureToggle & {
  /** Starting grouping, ordered outermost first. Column ids. */
  by?: string[]
  /** One column for every level, or one per level. Default `'single'`. */
  mode?: GroupingMode
  /** Presentation of the auto-injected `__group__` column. */
  column?: SystemColumnDef<TFeatures, TRow, TNode>
  /** Server-side grouping: rows arrive grouped. */
  manual?: boolean
  /** Called whenever the grouping levels change. */
  onChange?: (grouping: string[]) => void
}

export const GroupingMode = { Single: 'single', Multiple: 'multiple' } as const
export type GroupingMode = (typeof GroupingMode)[keyof typeof GroupingMode]
```

Column level, beside the existing column options at `core/src/column/types.ts:977-1019`:

```ts
/** `false` opts this column out of being groupable. */
grouping?: false | ColumnGroupingConfig

export type ColumnGroupingConfig = {
  /** Group by a derived value — the month of a date, a bucket, a first letter. */
  getValue?: (row: TRow, index: number) => unknown
}

/** Scalar names the function; the object form adds a renderer. */
aggregation?: AggregationFnName | ColumnAggregationConfig<TNode>

export type ColumnAggregationConfig<TNode> = {
  fn: AggregationFnName | AggregationFnDef
  component?: TNode
}
```

Both follow the settled naming rules: the `false | Config` scalar-or-object shape every other column
option uses, and a `ColumnMeta` key carrying the identical name as the option it holds.

Built-in aggregation names, from upstream: `sum · mean · median · min · max · extent · count ·
uniqueCount · unique · first · last`.

---

## 5. Architecture

```
core
 ├─ types.ts                 grouping?: boolean | GroupingConfig  (+ GroupingMode closed set)
 ├─ column/types.ts          column grouping? / aggregation?; SystemColumnType.Group;
 │                           ColumnMeta.grouping / .aggregation
 ├─ column/map-columns/      resolve both onto the TanStack column def + meta
 ├─ system-columns/          GROUP_COLUMN_ID, the __group__ builder, ordering
 ├─ create-table/            REQUIRED_FEATURE.grouping; AGGREGATION_FNS_SLOT guard;
 │                           groupedColumnMode: 'remove' wiring
 ├─ menu-icon/               GridMenuIcon.Group / .Ungroup
 ├─ messages/                columnMenu.groupBy / .ungroup; groupBar.*
 └─ features/entry.ts        docblock now false — rewrite

react/react  (no authored styles, data-* only)
 ├─ data-grid/cell.tsx       SystemCell branch for GROUP_COLUMN_ID → GroupCell;
 │                           aggregated / placeholder branches in BodyDataCell
 ├─ data-grid/row.tsx        data-group-row, aria-expanded via the aria layer
 ├─ data-grid/aria-state.ts  ariaExpandedAttrs(), group nesting level
 ├─ data-grid/group-by-bar.tsx        new, modelled on active-filters-bar.tsx
 ├─ data-grid/column-menu-sections.ts ColumnActionId.GroupBy / .Ungroup + the section
 ├─ data-grid/footer*.tsx    grand-total row from existing FooterRow / FooterCell
 └─ data-grid/data-grid.tsx  GroupByBar into DataGridStatics + the flat Object.assign

shadcn / heroui
 └─ styles.css only          generalise the data-depth rules to data-system-column='group';
                             style [data-slot='group-cell'] and the bar's chips
```

Note what is **not** in that tree: no new file under either kit's `blocks/`, because no new
component slot exists. Both kits gain CSS and nothing else. That is the design working.

---

## 6. Files to change

| File                                                | Action | Why                                                                               |
| --------------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| `core/src/types.ts`                                 | UPDATE | `grouping` option, `GroupingConfig`, `GroupingMode`                               |
| `core/src/column/types.ts`                          | UPDATE | column `grouping` / `aggregation`, `SystemColumnType.Group`, `ColumnMeta` keys    |
| `core/src/column/map-columns/map-columns.ts`        | UPDATE | resolve both onto def + meta                                                      |
| `core/src/system-columns/system-columns.ts`         | UPDATE | `GROUP_COLUMN_ID`, builder, ordering, `SystemColumnsOptions`                      |
| `core/src/create-table/create-table-options.ts`     | UPDATE | `REQUIRED_FEATURE.grouping`, `AGGREGATION_FNS_SLOT`, `groupedColumnMode`          |
| `core/src/menu-icon/menu-icon.ts`                   | UPDATE | `Group`, `Ungroup`                                                                |
| `core/src/messages/{defaults,types}.ts`             | UPDATE | menu + bar strings                                                                |
| `core/src/features/entry.ts`                        | UPDATE | the docblock at :56-63 is now false                                               |
| `core/src/features/entry.test.ts`                   | UPDATE | the `constructTable` test at :209-229 exists only because there was no config key |
| `react/react/src/data-grid/cell.tsx`                | UPDATE | group / aggregated / placeholder branches                                         |
| `react/react/src/data-grid/row.tsx`                 | UPDATE | group-row attributes                                                              |
| `react/react/src/data-grid/aria-state.ts`           | UPDATE | `ariaExpandedAttrs`, nesting level                                                |
| `react/react/src/data-grid/group-by-bar.tsx`        | CREATE | the bar                                                                           |
| `react/react/src/data-grid/column-menu-sections.ts` | UPDATE | menu items + `ColumnActionId`                                                     |
| `react/react/src/data-grid/data-grid.tsx`           | UPDATE | compound member, flat literal only                                                |
| `react/react/src/index.ts`                          | UPDATE | `DataGridGroupByBar` named export                                                 |
| `react/react/src/closed-sets.test.ts`               | UPDATE | the new closed-set members                                                        |
| `react/react/src/feature-optionality.test.tsx`      | UPDATE | a grid without `columnGroupingFeature` must render                                |
| `shadcn/src/styles.css`, `heroui/src/styles.css`    | UPDATE | depth selectors + group cell + chips                                              |
| both kits' + react's `package.json`                 | UPDATE | size-limit                                                                        |
| `apps/docs/**`                                      | see §8 | five registries and six tests                                                     |
| `.changeset/*.md`                                   | CREATE | `@ez-kit/data-grid-core` + `@ez-kit/data-grid-react` minor                        |

---

## 7. Not building

- Dragging a column into a group-by drop zone.
- The `'banner'` / full-width group row variant.
- A group-summary **header** row (impossible in heroui, see §3.7).
- Server-side grouping beyond passing `manual: true` through — no protocol, no fetch shape.
- Pagination that pages by group rather than by rendered row.
- Any new member of `FEATURE_COMPONENTS` or `FEATURE_OPTIONAL_COMPONENTS`.
- Nesting deeper than the 5 levels the existing indentation CSS covers. Either lift the cap or
  document it; do not leave it implicit.

---

## 8. Repository guards that will fail if skipped

Every one of these is a test that goes red, or worse a registry whose absence is silent at build
time and throws in the browser. This list is the reason the plan exists.

1. **`apps/docs/test/docs-options/page-type-map.ts`** — every new `.mdx` under
   `content/docs/data-grid/**` is walked from disk; an unmapped page fails. Add it to `DocPage`,
   then a `PAGE_ENTRIES` entry classifying **every** table as either an `optionTables` entry
   (governing type + exact `expectedCount`) or a `nonOptionTables` entry with a reason. Rows
   documenting a non-key (the literal `false` the column slot accepts) go in `OPTION_EXCEPTIONS`.
2. **`apps/docs/test/example-features/sets.ts`** — add
   `grouping: ['columnGroupingFeature', 'groupedRowModel', 'rowExpandingFeature', 'expandedRowModel']`
   to `REQUIRED_BY_OPTION`, and `grouping: 'columnGroupingFeature'` to
   `REQUIRED_BY_PERSISTED_SLICE` — without the second, a persisted snapshot silently drops the
   grouping levels, which is the `columnOrder` defect recorded in that file's docblock.
   **Verify** whether the collector sees column-level keys; `aggregation` is a column option, and if
   it does not, `aggregationFns` has no guard on the docs side.
3. **`apps/docs/test/e2e-slots.test.ts`** — every `data-slot` an e2e spec addresses must exist as a
   **literal** in one of the three package `src` trees. `group-cell` and the bar's slots must be
   written before a spec names them.
4. **`apps/docs/test/composition-slots.test.ts`** — under the composition roots (examples, presets,
   docs snippets) no host element may carry an unrecorded `data-slot`. The bar must ship as a
   component; a hand-written `<div data-slot='group-by-bar'>` in an example fails.
5. **`apps/docs/test/css-custom-properties.test.ts`** — any new `--dg-*` needs both a writer and a
   reader; it fails in both directions.
6. **`apps/docs/test/tree-shaking.test.ts`** — record the new entry-point sets. `GroupByBar` goes
   into the compound namespace **only** as a flat key of the existing
   `/* @__PURE__ */ Object.assign(…)` literal — never a spread, never a separate assignment.
7. **`react/react/src/contract.test.ts`** — asserts `COMPONENT_FEATURE` has exactly 46 keys and
   hardcodes the optional-Core array. Under §3.5 neither changes; if that decision is ever revisited,
   both must be updated in the same commit.
8. **`apps/docs/shared/data-grid/examples/`** — a component, a `manifest.json` entry (`id` →
   `sourceFile` + `exportName`), and for a new source file a hand-written line in `registry.ts`.
   Miss the last and the example throws at render while lint, typecheck and build all pass.
9. **`apps/docs/components/feature-matrix.data.ts`** — `Row grouping + aggregation` goes
   `Planned` → `Done` **with** a `doc:` slug; `feature-matrix.test.ts` resolves that slug against a
   real `.mdx` (`<slug>.mdx` or `<slug>/index.mdx`).
10. **`apps/docs/content/docs/data-grid/meta.json`** — add `"grouping"` to `pages`, and a nested
    `meta.json` inside the folder if it gets sub-pages, mirroring `expanding/meta.json`.
11. **size-limit** — a `dist/grouping/index.js` entry is _not_ needed under §3.5 (no kit subpath is
    added), but the react package's `dist/index.js` budget will move. Re-measure.
12. **changeset** — `@ez-kit/data-grid-core` and `@ez-kit/data-grid-react`, minor.
    **Never name `@ez-kit/data-grid-shadcn`**: it is `private` and in `.changeset/config.json`'s
    `ignore`, and `scripts/check-changesets.mjs` rejects both a changeset naming only ignored
    packages and one mixing ignored with released.
13. **shadcn registry payload** — new files under `blocks/` sweep in automatically
    (`scripts/generate-shadcn-registry-manifest.mjs:38`). Under §3.5 there are none, so nothing new
    reaches `npx shadcn add`. If that changes, it changes for every consumer.

---

## 9. Ordering and the a11y dependency

Grouping lands **after** the accessibility branch currently in flight, and this is a hard
dependency rather than a preference.

A group row needs `aria-expanded`. In the heroui kit React Aria's `filterDOMProps` silently drops
`aria-sort`, `aria-selected`, `aria-rowcount`, `aria-rowindex`, `aria-busy` and
`aria-multiselectable` before they reach the DOM, which is why that kit carries them as `data-aria-*`
and mirrors them back with a `MutationObserver` (`heroui/src/blocks/core/aria-state.ts:26`).

`expanded` is **not** in that mirrored list, and `aria-expanded` is currently written nowhere at
all — `heroui/src/blocks/expanding/Chevron.tsx:21` writes only an `aria-label` that reads "Expand" or
"Collapse". So the expanded state of a tree or sub-content row is today announced by a button label
and by nothing else.

That is a pre-existing gap in `expanding`, not new work belonging to grouping. It should be fixed on
the a11y branch — add `expanded` to `MIRRORED`, author the attribute in the shared layer — and then
grouping arrives to a working mechanism instead of threading one attribute through two branches at
once.

Second heroui trap, for whoever writes the group cell: a `ref` **prop** on a collection element
never reaches the DOM node, because React Aria renders the collection twice and only the second pass
receives it. Use `forwardRef`, as `Thead` and `Tr` already do.

### Suggested PR split

1. **Core config surface** — options, meta, system column, guards, messages, icons; the two stale
   docblocks and the `constructTable` test. Unit tests only.
2. **React rendering** — the four cell modes, the group cell, group-row attributes, the aria helper,
   the footer total.
3. **Controls** — column-menu items, `GroupByBar`, the compound member and named export.
4. **Kits + docs** — the two stylesheets, examples, pages, e2e specs, the matrix, the changeset.

Each stands alone and is reviewable; 1 and 2 are where the design risk sits.

---

## 10. Testing

**Core (vitest, colocated.)** Grouping by one column and by two; `getValue` deriving a grouping
key; `enableGrouping: false` on a column; `groupedColumnMode: 'remove'` taking the source column
out and putting it back; each of the eleven aggregation functions on a grouped column; a grand
total with `rowAggregationFeature` alone and **no** grouped row model; `REQUIRED_FEATURE` and
`AGGREGATION_FNS_SLOT` warning in development and staying quiet in production; `__group__`
appearing in the right position and honouring its `SystemColumnDef`.

**React (vitest + testing-library.)** The four cell modes, with an explicit assertion that a
placeholder cell renders nothing; the cascade — a group checkbox selects every descendant and shows
indeterminate for a partial set; no actions cell, no edit affordance and no move control on a group
row; a grid built **without** `columnGroupingFeature` renders (a new `OPTIONAL` case in
`feature-optionality.test.tsx`); `GroupByBar` renders `null` with no levels and one chip per level;
removing and reordering levels.

**e2e (Playwright, both kits.)** One spec under
`apps/docs/e2e/packages/data-grid/grouping/`, addressing `data-slot` and `data-*` rather than
pixels, and driving: group via the column menu, expand and collapse, cascade-select a group and act
on it from the `ActionBar`, drop a level from the bar, and read the footer total. Written once,
run against both kits by the existing matrix.

**Edge cases.** Empty data with grouping on; every row in one group; a grouping column holding
`null` / `undefined`; a group of one row; grouping plus an active filter that empties a group;
grouping beyond depth 5 (see §7); grouping on with pagination such that a page ends mid-group;
grouping and `expanding` in sub-content mode at once.

---

## 11. Validation

```bash
pnpm build                                        # dist/** and .source first — everything else depends on it

pnpm --filter @ez-kit/data-grid-core   test
pnpm --filter @ez-kit/data-grid-react  test
pnpm --filter @ez-kit/data-grid-shadcn test
pnpm --filter @ez-kit/data-grid-heroui test
pnpm --filter @ez-kit/docs             test      # docs-option-names, e2e-slots, tree-shaking,
                                                 # composition-slots, css-custom-properties,
                                                 # example-features, feature-matrix

pnpm lint && pnpm typecheck && pnpm size
pnpm test:react18                                 # the react-18 peer promise

pnpm --filter @ez-kit/docs build
pnpm --filter @ez-kit/docs exec playwright test --project=shadcn --project=heroui
```

CI gates a PR into `develop` with `verify` (`build → lint → typecheck → test → test:react18 → size`)
plus the browser suite behind the fixed-name `e2e gate` job.

---

## 12. Risks

| Risk                                                           | Likelihood | Impact             | Mitigation                                                                                                            |
| -------------------------------------------------------------- | ---------- | ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| A contract slot turns out to be unavoidable mid-implementation | Low        | **High** — a major | Decide it at PR 2, before anything ships. §3.5 keeps the fallback path real rather than theoretical.                  |
| `aria-expanded` cannot be made to survive React Aria           | Low        | High               | Prove it on the a11y branch first (§9). The `data-aria-*` carrier is a working precedent for six attributes.          |
| The docs `example-features` collector misses column-level keys | Medium     | Low                | §8.2 — check early; a missing guard is silent, not red.                                                               |
| Indentation beyond 5 levels                                    | Medium     | Low                | Lift the cap or document it; do not leave it implicit.                                                                |
| Grouping + virtualization row heights                          | Low        | Medium             | A group row is a row; cover it in the e2e spec rather than assuming.                                                  |
| Pagination ending mid-group reads as a bug                     | High       | Low                | It is upstream behaviour and both commercial grids share it. Document it on the page, not in a docblock nobody reads. |

---

## 13. References

- Upstream skills shipped inside the package:
  `node_modules/@tanstack/table-core/skills/grouping/SKILL.md`,
  `.../skills/aggregation/SKILL.md`
- Upstream types: `dist/features/column-grouping/`, `dist/features/row-aggregation/`
- AG Grid group display types — https://www.ag-grid.com/react-data-grid/grouping-display-types/
- MUI X row grouping — https://mui.com/x/react-data-grid/row-grouping/
- TanStack v9 grouping example — https://tanstack.com/table/latest/docs/framework/react/examples/grouping

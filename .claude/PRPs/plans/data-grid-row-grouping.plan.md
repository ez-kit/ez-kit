# Plan: data-grid row grouping + aggregation

## Summary

Wire TanStack v9's already-vendored `columnGroupingFeature` / `rowAggregationFeature` to a public
config surface, render group rows through a fourth system column `__group__`, and add the two
controls (column-menu items, `<DataGrid.GroupByBar />`) that let a user regroup. Aggregation ships
in the same pass and also works standalone as a footer grand total.

**Design document:** `docs/superpowers/specs/2026-09-24-data-grid-row-grouping-design.md`.
Read it first — every "why" lives there, this file is the "how" and does not restate the arguments.

## User story

As a developer building an operational screen, I want rows grouped by a column with subtotals under
their own columns, so that a reader sees structure and magnitude without leaving the grid — and as
that screen's user, I want to regroup it myself without a code change.

## Problem → Solution

The engine ships and is unreachable (`core/src/features/entry.ts:56-63` says so in prose) → a
config surface, a render path, two controls, docs.

## Metadata

- **Complexity:** Large
- **Source spec:** `docs/superpowers/specs/2026-09-24-data-grid-row-grouping-design.md`
- **Estimated files:** ~30 across 4 packages + `apps/docs`
- **Blocked on:** the a11y branch `chore/heroui-3.2` — see Task 10 and spec §9
- **Contract change:** none. Not one key added to `FEATURE_COMPONENTS` or
  `FEATURE_OPTIONAL_COMPONENTS`. If implementation pressure suggests otherwise, **stop and
  re-open the design** rather than adding one.

---

## UX

### Before

```
│ name    │ region │ manager │ deals │ revenue │
│ ACME-1  │ EMEA   │ Ivanov  │     1 │  50 000 │
│ ACME-2  │ EMEA   │ Ivanov  │     1 │  38 000 │
│ GLOB-7  │ APAC   │ Chen    │     1 │  22 000 │
   … 400 more rows, no structure, no totals
```

### After

```
│ Group              │ deals │ revenue   │ name   │
│ ▾ EMEA (42)        │    42 │ 1 200 000 │        │   ← group row, aggregates under their columns
│   ▾ Ivanov (18)    │    18 │   540 000 │        │   ← level 2, indented via data-depth
│       ACME-1       │     1 │    50 000 │ ACME-1 │   ← leaf row
│   ▸ Petrova (24)   │    24 │   660 000 │        │
│ ▸ APAC (17)        │    17 │   430 000 │        │
├────────────────────┼───────┼───────────┼────────┤
│ Total              │   478 │ 9 840 000 │        │   ← footer grand total (works without grouping)
```

### Interaction changes

| Touchpoint   | Before                   | After                                                                    |
| ------------ | ------------------------ | ------------------------------------------------------------------------ |
| Column menu  | sort · pin · hide · move | + **Group by this column** / **Ungroup**                                 |
| Toolbar      | search, filters, columns | + optional `<DataGrid.GroupByBar />` with one chip per level             |
| Row checkbox | selects one row          | on a group row, cascades to every descendant; indeterminate when partial |
| Footer       | absent or static         | optional grand-total row                                                 |

---

## Mandatory reading

| Priority | File                                                                                      | Why                                                             |
| -------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| P0       | `docs/superpowers/specs/2026-09-24-data-grid-row-grouping-design.md`                      | every decision, with rationale                                  |
| P0       | `AGENTS.md` §"features are composed by the consumer", §"Settled data-grid API decisions"  | the rules this plan obeys                                       |
| P0       | `node_modules/@tanstack/table-core/skills/grouping/SKILL.md` + `.../aggregation/SKILL.md` | upstream's own guidance, shipped in the package                 |
| P0       | `core/src/system-columns/system-columns.ts` (all 207 lines)                               | the thing being extended by one                                 |
| P0       | `core/src/create-table/create-table-options.ts:106-320`                                   | the guard family                                                |
| P1       | `core/src/types.ts:516-575` (`ExpandingMode`, `ExpandingConfig`)                          | the config template                                             |
| P1       | `core/src/column/map-columns/map-columns.ts:108-200`                                      | how a column option resolves                                    |
| P1       | `react/react/src/data-grid/cell.tsx:140-304`                                              | `SystemCell` dispatch + `ExpandCell`                            |
| P1       | `react/react/src/data-grid/active-filters-bar.tsx` (all)                                  | the `GroupByBar` template                                       |
| P1       | `react/react/src/data-grid/data-grid.tsx` (tail)                                          | the flat `Object.assign`                                        |
| P2       | `core/src/features/ordering/row-ordering-feature.ts`                                      | only if a custom feature turns out to be needed (it should not) |
| P2       | `apps/docs/test/docs-options/page-type-map.ts`                                            | the docs-page recipe                                            |

## External documentation

| Topic                | Source                                                 | Takeaway                                                                                                                  |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| v9 grouping          | package-local `skills/grouping/SKILL.md`               | `columnGroupingFeature` + `groupedRowModel`; four cell modes; count descendants via `subRows`, never via the render model |
| v9 aggregation       | package-local `skills/aggregation/SKILL.md`            | independent of grouping; `column.getAggregationValue()`; `constructAggregationFn({aggregate, merge})`; 11 built-ins       |
| Group display shapes | AG Grid `grouping-display-types`, MUI X `row-grouping` | both inject a synthetic column; `single` is the default in both                                                           |

---

## Patterns to mirror

### CONFIG_TYPE — a feature config

```ts
// SOURCE: core/src/types.ts:522-529, 540-569
export const ExpandingMode = { SubContent: 'sub-content', Tree: 'tree' } as const
export type ExpandingMode = (typeof ExpandingMode)[keyof typeof ExpandingMode]

export type ExpandingConfig<
	TFeatures extends TableFeatures,
	TRow extends object = object,
	TRenderExpanded = unknown,
	TNode = unknown,
> = FeatureToggle & {
	mode?: ExpandingMode
	getSubRows?: (row: TRow, index: number) => TRow[] | undefined
	onChange?: (expanded: ExpandedState) => void
	column?: SystemColumnDef<TFeatures, TRow, TNode>
}
```

### COLUMN_RESOLUTION — an option onto def + meta

```ts
// SOURCE: core/src/column/map-columns/map-columns.ts:178-186
if (sorting === false) {
	result.enableSorting = false
} else if (sorting !== undefined) {
	setIfDefined(result, 'sortDescFirst', sorting.descFirst)
	setIfDefined(result, 'sortFn', sorting.fn)
}
// SOURCE: map-columns.ts:136-149
const meta: MappedColumnDef<TRow>['meta'] = {}
setIfDefined(meta, 'pinning', normalizeColumnPinning(pinning))
setIfDefined(meta, 'align', normalizeColumnAlign(align))
```

### DEV_GUARD — config key needs a feature

```ts
// SOURCE: core/src/create-table/create-table-options.ts:142-155
const REQUIRED_FEATURE = {
	sorting: 'rowSortingFeature',
	expanding: 'rowExpandingFeature',
	…
} as const satisfies Partial<Record<keyof TableConfig<TableFeatures, object>, string>>
```

The loop that reads it (`:560-570`) is fully generic — adding a key is the whole change.

### SYSTEM_CELL — rendering a system column

```tsx
// SOURCE: react/react/src/data-grid/cell.tsx:269-304
function ExpandCell<TRow extends object>({ cell, row, chrome, children }: SystemSubProps<TRow>) {
	const { Td } = useGridComponents().core
	const { Chevron } = useGridComponents().expanding
	useDataGridState((s) => s.expanded)
	const canExpand = row.getCanExpand()
	const isExpanded = row.getIsExpanded()
	return (
		<Td
			{...chrome.navigation}
			data-slot='td'
			style={chrome.pinVars}
			pinned={chrome.pinned}
			{...chrome.pinnedAttrs}
			{...chrome.alignAttrs}
			{...chrome.classNameAttr}
			data-system-column='expand'
			data-depth={row.depth}
		>
			{renderCellContent(
				children,
				cell,
				row,
				canExpand ? (
					<Chevron
						expanded={isExpanded}
						onClick={() => {
							row.toggleExpanded()
						}}
					/>
				) : null,
			)}
		</Td>
	)
}
```

### COMPOSED_BAR — a toolbar-mounted control

```tsx
// SOURCE: react/react/src/data-grid/active-filters-bar.tsx
export function ActiveFiltersBar({ position: positionProp }: DataGridActiveFiltersBarProps = {}) {
	const table = useDataGridTable()
	const columnFilters = useDataGridState((s) => s.columnFilters)
	const { FilterChip } = useGridComponents().filtering
	// …build chips…
	if (chips.length === 0) return null
	return (
		<div
			data-slot='active-filters-bar'
			data-chip-position={position}
		>
			{chips.map((c) => (
				<FilterChip
					key={c.key}
					{...c}
				/>
			))}
		</div>
	)
}
```

Note: plain `div`, **no authored className**, `data-*` only, `null` when empty.

### RUNTIME_FEATURE_GUARD — an optional feature's slice

```tsx
// SOURCE: react/react/src/data-grid/row.tsx:161-162
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
const isSelected = useDataGridState(() => row.getIsSelected?.() ?? false)
```

The disable is required and deliberate — the widest instantiation says the check cannot fail; it can.

### TEST_STRUCTURE — core

```ts
// SOURCE: core/src/features/ordering/row-ordering-feature.test.ts:1-63
const ORDERING = tableFeatures({ …, rowOrderingFeature })
const ORDERING_PAGED = tableFeatures({ …ORDERING, rowPaginationFeature, paginatedRowModel: createPaginatedRowModel() })
describe('row ordering', () => { it('moves a row down', () => { /* build, act, expect */ }) })
```

One module-level feature set per interacting-feature combination; no literal `// Arrange` comments.

---

## Files to change

| File                                                       | Action                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `core/src/types.ts`                                        | UPDATE — `GroupingMode`, `GroupingConfig`, `TableConfig.grouping`                     |
| `core/src/column/types.ts`                                 | UPDATE — column `grouping`/`aggregation`, `SystemColumnType.Group`, `ColumnMeta` keys |
| `core/src/column/map-columns/map-columns.ts`               | UPDATE                                                                                |
| `core/src/system-columns/system-columns.ts`                | UPDATE — `GROUP_COLUMN_ID`, builder, ordering                                         |
| `core/src/create-table/create-table-options.ts`            | UPDATE — guards, `groupedColumnMode`, `buildColumnList` call site                     |
| `core/src/menu-icon/menu-icon.ts`                          | UPDATE                                                                                |
| `core/src/messages/{defaults,types}.ts`                    | UPDATE                                                                                |
| `core/src/features/entry.ts`                               | UPDATE — stale docblock                                                               |
| `core/src/features/entry.test.ts`                          | UPDATE — the `constructTable` workaround                                              |
| `react/react/src/data-grid/aria-state.ts`                  | UPDATE                                                                                |
| `react/react/src/data-grid/cell.tsx`                       | UPDATE — group / aggregated / placeholder                                             |
| `react/react/src/data-grid/row.tsx`                        | UPDATE                                                                                |
| `react/react/src/data-grid/group-by-bar.tsx`               | CREATE                                                                                |
| `react/react/src/data-grid/column-menu-sections.ts`        | UPDATE                                                                                |
| `react/react/src/data-grid/data-grid.tsx`                  | UPDATE                                                                                |
| `react/react/src/index.ts`                                 | UPDATE                                                                                |
| `react/react/src/{closed-sets,feature-optionality}.test.*` | UPDATE                                                                                |
| `shadcn/src/styles.css`, `heroui/src/styles.css`           | UPDATE                                                                                |
| `apps/docs/**`                                             | see Tasks 24-30                                                                       |
| `.changeset/row-grouping.md`                               | CREATE                                                                                |

## NOT building

Verbatim from spec §7 — dragging into a drop zone; the banner variant; a group-summary header row;
a server grouping protocol; pagination by group; **any** new contract component; depth beyond 5
without either lifting the cap or documenting it.

---

## Step-by-step tasks

### PR 1 — core config surface

#### Task 1: `GroupingMode` + `GroupingConfig`

- **ACTION** Add the closed set and the config type to `core/src/types.ts`, beside `ExpandingConfig`.
- **IMPLEMENT** `GroupingMode = { Single: 'single', Multiple: 'multiple' } as const` + union type;
  `GroupingConfig<TFeatures, TRow, TNode> = FeatureToggle & { by?: string[]; mode?: GroupingMode;
column?: SystemColumnDef<TFeatures, TRow, TNode>; manual?: boolean; onChange?: (grouping: string[]) => void }`.
  One-line doc comment per field, in the house style.
- **MIRROR** CONFIG_TYPE.
- **GOTCHA** Closed sets are const-object-plus-union, never a bare literal union — the rule is
  enforced by `react/react/src/closed-sets.test.ts`.
- **VALIDATE** `pnpm --filter @ez-kit/data-grid-core typecheck`

#### Task 2: `TableConfig.grouping`

- **ACTION** Add `grouping?: boolean | GroupingConfig<TFeatures, TRow>` to `TableConfig`
  (`core/src/types.ts:871-905`, beside `expanding`).
- **GOTCHA** `TableConfig` declares every option unconditionally — registering the feature is a
  **separate** axis, and the type will not stop `grouping` beside a missing `columnGroupingFeature`.
  That is by design (see `AGENTS.md`: the guards are runtime-only); Task 6 is what catches it.
- **VALIDATE** typecheck

#### Task 3: column options + `SystemColumnType.Group`

- **ACTION** In `core/src/column/types.ts`: add `grouping?: false | ColumnGroupingConfig` and
  `aggregation?: AggregationFnName | ColumnAggregationConfig<TNode>` to `ColumnDefCommon`
  (`:977-1019`); add `Group: 'group'` to `SystemColumnType` (`:1163-1172`); add `grouping` and
  `aggregation` to the `ColumnMeta` augmentation (`:1232-1268`).
- **GOTCHA** A `ColumnMeta` key carries the **identical** name as the column option it holds — never
  a third spelling. This is a settled rule with a cautionary note already in that file at `:1243-1246`.
- **VALIDATE** typecheck

#### Task 4: resolve the column options

- **ACTION** In `map-columns.ts`, resolve `grouping` and `aggregation` onto the TanStack def and meta.
- **IMPLEMENT** `grouping === false → result.enableGrouping = false`; `grouping.getValue →
result.getGroupingValue`; `aggregation` scalar or object → `result.aggregationFn`, and the object's
  `component` onto `meta.aggregation`.
- **MIRROR** COLUMN_RESOLUTION.
- **GOTCHA** `aggregationFn` is a **native** TanStack `ColumnDef` field — pass it straight through,
  do not route the function itself through meta. Meta carries only the renderer.
- **VALIDATE** `pnpm --filter @ez-kit/data-grid-core test`

#### Task 5: the `__group__` system column

- **ACTION** Extend `core/src/system-columns/system-columns.ts`.
- **IMPLEMENT** (a) `export const GROUP_COLUMN_ID = '__group__'` beside the other three at `:10-12`;
  (b) `grouping: boolean` + `groupingColumn?: SystemColumnDef<TableFeatures>` on
  `SystemColumnsOptions` (`:14-53`); (c) a push block in `buildColumnList` (`:123-181`) placing
  `__group__` **after** `__expand__` and before user columns, so the order is
  `[__selection__, __expand__, __group__, …user, __actions__]`; (d) under `mode: 'multiple'`, one
  column per level rather than one.
- **GOTCHA** `mode: 'multiple'` makes the column **count** depend on grouping state, so the builder
  must read the current grouping, not only the config. Ship `'single'` first and add `'multiple'`
  behind its own test — the spec allows that order.
- **VALIDATE** `pnpm --filter @ez-kit/data-grid-core test` — a new
  `system-columns.test.ts` case asserting position and `SystemColumnDef` honouring.

#### Task 6: guards + `groupedColumnMode`

- **ACTION** In `create-table-options.ts`: add `grouping: 'columnGroupingFeature'` to
  `REQUIRED_FEATURE` (`:142-155`); add an `AGGREGATION_FNS_SLOT` guard mirroring `SORT_FNS_SLOT`
  (`:232-263`); set `groupedColumnMode: 'remove'`; feed the new `SystemColumnsOptions` fields at the
  `buildColumnList(` call site.
- **MIRROR** DEV_GUARD.
- **GOTCHA** Read the docblock at `:106-118` before adding the `REQUIRED_FEATURE` entry — a key
  belongs there only when the bare `true` means "the whole feature", which is the case for grouping
  and was **not** for `ordering`. The `AGGREGATION_FNS_SLOT` guard condition is: grouping is on, some
  column names an aggregation **by string**, and `aggregationFns` is not registered.
- **VALIDATE** a test asserting `console.warn` fires in development and is silent in production

#### Task 7: icons + messages

- **ACTION** `GridMenuIcon.Group = 'group'` and `.Ungroup = 'ungroup'` in `core/src/menu-icon/menu-icon.ts`;
  `columnMenu.groupBy` / `.ungroup` and a `groupBar.*` section in `core/src/messages/defaults.ts`
  and `messages/types.ts`.
- **GOTCHA** No logical/physical RTL concern here — grouping has no direction, so none of the
  `pinStart` / `moveStart` reasoning applies. Do not copy those docblocks.
- **VALIDATE** typecheck + `messages` tests

#### Task 8: retire the two stale docblocks

- **ACTION** Rewrite `core/src/features/entry.ts:56-63` (it says `TableConfig` has no `grouping`
  option — now false) and the note at `create-table-options.ts:256-262` ("if grouping ever gains a
  config key, this is the shape its guard takes" — it just did). Replace the `constructTable`-based
  test at `core/src/features/entry.test.ts:209-229` with one built through `createTable` and the new
  config key, and delete its explanatory docblock.
- **GOTCHA** This is the "grep for the behaviour, not the identifier" rule: sweep for prose
  describing the absence, not only for the word `grouping`.
- **VALIDATE** `pnpm --filter @ez-kit/data-grid-core test`

#### Task 9: core test suite

- **ACTION** Cover spec §10's core list.
- **IMPLEMENT** One module-level feature set per interaction: `GROUPING`, `GROUPING_PAGED`,
  `GROUPING_SORTED`, `GROUPING_SELECTED`, `AGGREGATION_ONLY` (no grouped row model — proves the
  footer-total case pays nothing).
- **MIRROR** TEST_STRUCTURE.
- **GOTCHA** Count descendants recursively through `subRows`; `getRowModel().rows` is render order
  and mixes group and leaf rows. Upstream flags this as the #1 mistake.
- **VALIDATE** `pnpm --filter @ez-kit/data-grid-core test`

### PR 2 — react rendering

#### Task 10: (prerequisite, a11y branch) `aria-expanded` in heroui

- **ACTION** On `chore/heroui-3.2`, not here: add `'expanded'` to `MIRRORED` in
  `heroui/src/blocks/core/aria-state.ts:26` and author `aria-expanded` in the shared layer.
- **GOTCHA** React Aria's `filterDOMProps` drops it otherwise. Today it is written **nowhere** — the
  expanded state of a tree row is announced only by the chevron's `aria-label`. This is an existing
  `expanding` gap, not grouping's work.
- **VALIDATE** `heroui/src/blocks/core/aria-state.test.tsx`

#### Task 11: aria helpers

- **ACTION** Add `ariaExpandedAttrs(canExpand, isExpanded)` and a group nesting-level helper to
  `react/react/src/data-grid/aria-state.ts`; consume in `row.tsx` beside `ariaRowIndexAttrs`.
- **MIRROR** `ariaSortAttrs` (`aria-state.ts:21-43`) — pure function, returns `{ 'aria-…'?: … }`, no
  attribute at all when the state does not apply.
- **GOTCHA** A non-expandable row gets **no** attribute, not `aria-expanded='false'` — same reasoning
  as `aria-sort` not being written as `'none'` on unsortable columns.
- **VALIDATE** `react/react/src/data-grid/aria-state.test.ts`

#### Task 12: the group cell

- **ACTION** Add a `GROUP_COLUMN_ID` branch to `SystemCell` (`cell.tsx:170-227`) rendering a new
  local `GroupCell`.
- **IMPLEMENT** `core.Td` with `data-slot='group-cell'`, `data-system-column='group'`,
  `data-depth={row.depth}`; content = `expanding.Chevron` + the grouping value + the descendant
  count. Subscribe with `useDataGridState((s) => s.expanded)`.
- **MIRROR** SYSTEM_CELL.
- **GOTCHA** No new contract component. Chevron comes from the **expanding** group, which means a
  grid that groups must register `rowExpandingFeature` — already enforced by Task 6's
  `REQUIRED_BY_OPTION` sibling in docs (Task 28). Guard the read: `row.getIsGrouped?.()`.
- **VALIDATE** `pnpm --filter @ez-kit/data-grid-react test`

#### Task 13: aggregated and placeholder cells

- **ACTION** Branch `BodyDataCell` on `cell.getIsAggregated?.()` and `cell.getIsPlaceholder?.()`.
- **IMPLEMENT** aggregated → `meta.aggregation?.component ?? the column's existing cell-type view`;
  placeholder → `null`.
- **GOTCHA** A placeholder that renders its value shows an arbitrary row's datum as if it described
  the group. This is the defect upstream's guidance leads with; assert it explicitly in a test.
- **VALIDATE** react tests

#### Task 14: group-row attributes

- **ACTION** In `row.tsx:209-229`, add `data-group-row` and the aria attrs from Task 11.
- **GOTCHA** Namespace the attribute. `data-row-selected` is spelled that way (not `data-selected`)
  precisely because React Aria's `Row` writes its own `data-selected` after spreading and would
  clobber it — see the comment at `row.tsx:152-156`. Check any new name against RAC's own set.
- **VALIDATE** react tests + heroui kit test

#### Task 15: the footer grand total

- **ACTION** Render a totals row from the existing `DataGrid.FooterRow` / `FooterCell`, reading
  `column.getAggregationValue?.()`.
- **GOTCHA** Must work with `rowAggregationFeature` **alone** — no `columnGroupingFeature`, no
  `groupedRowModel`. That is the whole point of the split; test it that way.
  heroui needs no adapter work: its footer rows are the same `Tr`/`Td` as body rows
  (`table-adapters.tsx:158-222`).
- **VALIDATE** react tests, both kits

#### Task 16: guards on group rows

- **ACTION** Suppress row actions, editing, deleting and row-ordering controls when
  `row.getIsGrouped?.()`.
- **GOTCHA** Without this, `ActionsCell` renders on a synthetic row and its Delete acts on nothing.
  Row-ordering controls additionally go away whenever grouping is non-empty, not only on group rows.
- **VALIDATE** react tests

#### Task 17: feature optionality

- **ACTION** Add `columnGroupingFeature` to `OPTIONAL` in `feature-optionality.test.tsx:81-89` and
  confirm a grid built without it renders.
- **MIRROR** RUNTIME_FEATURE_GUARD — every new read on the default render path is `?.` with the
  scoped eslint disable.
- **GOTCHA** Do not "tidy up" those disables. They read as unnecessary only under the widest
  instantiation. Grouping is **not** structural — the structural three stay exactly three.
- **VALIDATE** `pnpm --filter @ez-kit/data-grid-react test`

### PR 3 — controls

#### Task 18: column-menu items

- **ACTION** Add `ColumnActionId.GroupBy` / `.Ungroup` and the menu section in
  `react/react/src/data-grid/column-menu-sections.ts`.
- **IMPLEMENT** Items gated on `column.getCanGroup?.()`; label from `messages.columnMenu.*`; icon
  from `GridMenuIcon.Group` / `.Ungroup`; `onAction` → `column.toggleGrouping()`.
- **GOTCHA** `ColumnActionId` values are ids that reach the DOM — treat a rename as a breaking
  change, as `pin-start` / `pin-end` were.
- **VALIDATE** `closed-sets.test.ts` + a menu test

#### Task 19: `GroupByBar`

- **ACTION** Create `react/react/src/data-grid/group-by-bar.tsx`.
- **IMPLEMENT** One chip per level, ordered; remove-level and move-up / move-down per chip; `null`
  when there are no levels; `data-slot='group-by-bar'` on a plain `div`; chips rendered through
  `core.Button` (`aria-pressed` where it reads as a toggle), the add-level picker through `core.Menu`.
- **MIRROR** COMPOSED_BAR.
- **GOTCHA** Three traps at once: (a) **no authored className** — this package has zero styling;
  (b) selectors must be referentially stable, so read `s.grouping` directly and never stitch slices
  into a fresh object (that is the documented infinite-loop case); (c) `AGENTS.md` names the group-by
  picker as a `core.Menu` case — do **not** add a feature-specific menu slot.
- **VALIDATE** react tests — renders `null` empty, one chip per level, remove and reorder work

#### Task 20: exports

- **ACTION** Three edits in `data-grid.tsx`, in this order: the import line; `GroupByBar: typeof
GroupByBar` in `DataGridStatics`; `GroupByBar,` as a **flat key** in the existing
  `/* @__PURE__ */ Object.assign(DataGridRoot, { … })`. Then
  `export { GroupByBar as DataGridGroupByBar } from './data-grid/group-by-bar'` in `index.ts`.
- **GOTCHA** Never a spread into that literal and never a separate `DataGrid.X = X` assignment.
  Both silently un-tree-shake the entire namespace; esbuild keeps an annotated call whose argument
  spreads, and cannot drop a top-level assignment at all. `apps/docs/test/tree-shaking.test.ts`
  fails on both, via the `FilterPanel` `data-slot` probe.
- **VALIDATE** `pnpm --filter @ez-kit/docs test` (tree-shaking case)

### PR 4 — kits, docs, release

#### Task 21: stylesheets

- **ACTION** In both `styles.css`: generalise the depth rules from
  `tr[data-depth='N'] [data-system-column='expand']` to match `='group'` too
  (`shadcn:304-333`, `heroui:337-366`); style `[data-slot='group-cell']` and the bar's chips.
- **GOTCHA** Depth rules stop at 5. Either add levels or document the cap — do not leave it implicit
  (spec §7). If a `--dg-*` property is introduced, it needs both a writer and a reader or
  `css-custom-properties.test.ts` fails in **both** directions.
- **VALIDATE** `pnpm --filter @ez-kit/docs test` + visual check in both kits

#### Task 22: examples

- **ACTION** Add `shared/data-grid/examples/components/grouping/{basic,aggregation,interactive}.tsx`;
  register each id in `manifest.json`; add **one line per new source file** to `registry.ts`.
- **GOTCHA** Missing the `registry.ts` line throws at render while lint, typecheck and build all
  pass. Nothing catches it for you.
- **VALIDATE** `pnpm --filter @ez-kit/docs test` (`examples-registry`, `example-files`) + open the pages

#### Task 23: example feature sets

- **ACTION** In `apps/docs/test/example-features/sets.ts`: add
  `grouping: ['columnGroupingFeature', 'groupedRowModel', 'rowExpandingFeature', 'expandedRowModel']`
  to `REQUIRED_BY_OPTION`, and `grouping: 'columnGroupingFeature'` to `REQUIRED_BY_PERSISTED_SLICE`.
- **GOTCHA** **Check whether the collector sees column-level keys.** `aggregation` is a column
  option, and if `options` only collects JSX props and top-level config keys, `aggregationFns` has no
  docs-side guard — extend the collector or record the gap.
- **VALIDATE** `pnpm --filter @ez-kit/docs test`

#### Task 24: docs pages

- **ACTION** `content/docs/data-grid/grouping/{index,aggregation,interactive}.mdx` + a nested
  `meta.json`; add `"grouping"` to the parent `meta.json` `pages` array.
- **MIRROR** `content/docs/data-grid/expanding/tree.mdx` — frontmatter, `<DataGridDocsExample
exampleId=… />`, a mirroring `tsx` fence, `## Options`, `## Source`.
- **GOTCHA** Document the pagination-ends-mid-group behaviour **on the page**, not in a docblock.
- **VALIDATE** `pnpm docs:dev`

#### Task 25: page-type-map

- **ACTION** Add each page to `DocPage` and a `PAGE_ENTRIES` entry classifying **every** table.
- **GOTCHA** Verify the option names by hand against the real types first — the test resolves them
  through `ts.TypeChecker`, and `expectedCount` is exact, so drift fails. A row documenting the
  literal `false` the column slot accepts goes in `OPTION_EXCEPTIONS` with a reason.
- **VALIDATE** `pnpm --filter @ez-kit/docs test`

#### Task 26: e2e

- **ACTION** `apps/docs/e2e/packages/data-grid/grouping/grouping.spec.ts`.
- **IMPLEMENT** Group from the column menu; expand/collapse; cascade-select a group and act from the
  `ActionBar`; drop a level from the bar; read the footer total.
- **MIRROR** `selection/action-bar.spec.ts` — module-level slot constants, `grid.open(EXAMPLE)` in
  `beforeEach`, assertions on `data-*` and roles rather than pixels.
- **GOTCHA** Every `data-slot` the spec names must exist as a **literal** in a package `src` tree
  (`e2e-slots.test.ts`). Runs once per kit automatically.
- **VALIDATE** `pnpm --filter @ez-kit/docs exec playwright test --project=shadcn --project=heroui`

#### Task 27: matrix, size, changeset

- **ACTION** `feature-matrix.data.ts` — `Row grouping + aggregation` to `Done` **with** a `doc:`
  slug. Re-measure `pnpm size` and adjust the react package's `dist/index.js` budget.
  `.changeset/row-grouping.md` naming `@ez-kit/data-grid-core` and `@ez-kit/data-grid-react`, minor.
- **GOTCHA** `feature-matrix.test.ts` resolves the `doc:` slug against a real file. **Never name
  `@ez-kit/data-grid-shadcn`** in the changeset — it is ignored, and `check-changesets.mjs` rejects
  both a changeset naming only ignored packages and one mixing ignored with released.
- **VALIDATE** `pnpm lint && pnpm size && pnpm --filter @ez-kit/docs test`

---

## Validation commands

```bash
pnpm build                       # first — dist/** and .source gate everything else
pnpm lint                        # includes check-site-url + check-changesets
pnpm typecheck
pnpm test
pnpm test:react18
pnpm size

pnpm --filter @ez-kit/docs build
pnpm --filter @ez-kit/docs exec playwright test --project=shadcn --project=heroui
```

EXPECT: zero type errors, zero lint warnings, all suites green, no size regression beyond the
re-measured budget.

### Manual

- [ ] Group by one column, then by two — labels stack in one column, indented
- [ ] Aggregates line up under their own columns; placeholder cells are empty
- [ ] Footer total correct with grouping **off** and `rowAggregationFeature` alone
- [ ] Group checkbox cascades; partial selection is indeterminate; `ActionBar` count matches
- [ ] No actions / edit / move affordance on a group row
- [ ] `GroupByBar` chips remove and reorder levels
- [ ] Both kits, light and dark, and one RTL pass
- [ ] Screen reader announces group rows as expanded/collapsed in **both** kits

---

## Acceptance criteria

- [ ] Every task done, every validation green
- [ ] `FEATURE_COMPONENTS` and `FEATURE_OPTIONAL_COMPONENTS` **unchanged**; `contract.test.ts`
      untouched
- [ ] A grid without `columnGroupingFeature` renders
- [ ] Footer totals work with no grouping registered
- [ ] The three structural features are still exactly three
- [ ] No authored class name anywhere in `react/react`
- [ ] The two stale core docblocks and the `constructTable` test are gone
- [ ] Docs pages mapped; matrix `Done` with a resolving `doc:`; changeset present and legal

## Risks

Carried from spec §12 — a contract slot turning out unavoidable (decide at PR 2, not later);
`aria-expanded` under React Aria (prove on the a11y branch first); the docs collector missing
column-level keys (silent, not red); the depth-5 cap; pagination ending mid-group reading as a bug.

## Notes

The single biggest risk to this plan is treating it as "implement grouping". It is not — the engine
ships. Any task that starts to look like reimplementing a row model or an aggregation function means
the wrong path was taken; go back to the upstream skill files in
`node_modules/@tanstack/table-core/skills/`.

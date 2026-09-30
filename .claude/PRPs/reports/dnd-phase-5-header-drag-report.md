# Implementation Report: DnD Phase 5 — Header drag

**Status: COMPLETE.** Every task landed, the browser suite is green in both kits on two consecutive
full runs, and the react package is green on React 19 **and** React 18. Two defects the plan
predicted from measurement were real and are fixed; three more were found during implementation and
are recorded below, one of them deliberately **not** fixed.

## Assessment vs reality

| Metric        | Predicted (plan) | Actual                                                                                      |
| ------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| Complexity    | Large — 24 files | Large — 30 files (21 modified, 9 created)                                                   |
| Confidence    | 7/10             | The two measurement-dependent tasks both went the predicted way                             |
| Files changed | 24               | 32 (23 modified, 9 created)                                                                 |
| Unit tests    | 11 cases         | 31 cases, `column-drag.test.tsx`; react package 891 → 922; +4 per kit for `toDragOverEvent` |

## Tasks

| #   | Task                           | Status      | Notes                                                                                    |
| --- | ------------------------------ | ----------- | ---------------------------------------------------------------------------------------- |
| 1   | Probe: context reachability    | ✅ measured | **Reachable.** See below — the answer decided Tasks 2–3 and was not assumed.             |
| 2   | `column-drag.tsx` shell + hook | ✅          | Plus `HeaderThProps`, which the plan did not anticipate                                  |
| 3   | `header-cell.tsx`              | ✅          | Both `<th>` returns routed through one `renderTh` closure                                |
| 4   | The column commit              | ✅          | `canDropColumn` guard then `setColumnOrder(dropColumn(…))`                               |
| 5   | `group` per axis               | ✅          | Both adapters, plus a dedicated test case each                                           |
| 6   | `Th` forwards its ref          | ✅          | Both kits, the vendored `TableHead`, **and** the test kit — see _Findings_               |
| 7   | `messages.ordering.dragColumn` | ✅          |                                                                                          |
| 8   | Unit tests                     | ✅          | 20 cases                                                                                 |
| 9   | Handle component + exports     | ✅          | Added to the flat `Object.assign` literal, not as an assignment                          |
| 10  | Kit blocks + state CSS         | ✅          | `GripHorizontal`, deliberately not the row's `GripVertical`                              |
| 11  | Docs examples                  | ✅          | Deviated — see _Deviations_                                                              |
| 12  | Browser spec                   | ✅          | 7 cases × 2 kits, green twice consecutively                                              |
| 13  | Budget                         | ✅ raised   | Measured 29.58 kB; limit 29.5 → 30 kB                                                    |
| 14  | Changeset                      | ✅          | react / core / heroui — never shadcn                                                     |
| 15  | `canDrop` on the port          | ✅ added    | **Not in the plan.** Agreed with the user after a review pass; both axes. See finding 4. |

## Validation

| Check                    | Result                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `pnpm typecheck`         | ✅ clean                                                                                 |
| `pnpm lint`              | ✅ clean (0 warnings)                                                                    |
| `pnpm test`              | ✅ all packages; `data-grid-react` 922, `docs` 208, `data-grid-core` 797                 |
| `test:react18`           | ✅ 922 — **failed first**, and caught a real defect; see _Findings_                      |
| `pnpm build`             | ✅ 15/15                                                                                 |
| `pnpm size`              | ✅ after an explicit raise; numbers below                                                |
| Registry payload         | ✅ `@dnd-kit` count 0; `ColumnDragHandle` present; `TableHead` `forwardRef` present      |
| Browser, `column drag`   | ✅ 14/14 (7 × 2 kits), twice consecutively, fresh dev server                             |
| Browser, `row drag`      | ✅ 8/8 — unchanged by the `group` fix                                                    |
| Browser, **whole suite** | 610 / 3 / 2, twice — two pre-existing, one flaky and a different one each run; see below |

### The whole-suite failures, checked rather than assumed

Run twice — once before the review pass and once after, since the second round touched the keyboard
model, which every spec goes through. **Both runs: 610 passed, 3 failed, 2 skipped**, and the same
count is not the same three.

- `filtering/chips.spec.ts:127 › Clear-all empties the strip whatever raised the chips`, both kits, in
  both runs — **pre-existing.** Reproduced 2/2 on a baseline tree (this phase's tracked changes
  stashed and its untracked files moved aside), which is the only way to tell a regression from a
  standing failure.
- The third differed between runs — `pagination/paging.spec.ts:63` the first time,
  `fallbacks/fallbacks.spec.ts:94` the second — and each passes in isolation (the second twice over).
  **Flaky**, and a different case each run is itself the evidence.

Also worth recording: `@ez-kit/form-heroui`'s `remaining-fields.test.tsx` failed once inside a full
`pnpm test` and passes twice in isolation. Nothing in this phase touches that package.

### Sizes, measured

| Entry                           | Before   | After        | Note                                                                                                              |
| ------------------------------- | -------- | ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `@ez-kit/data-grid-react` root  | 29.02 kB | **29.67 kB** | Limit raised 29.5 → 30 kB. +~600 B for the two modules, the compound member, the render-args field and `canDrop`. |
| `@ez-kit/data-grid-heroui` root | 14.95 kB | 14.94 kB     | Unchanged within noise (limit 16.6 kB)                                                                            |
| `@ez-kit/data-grid-shadcn` root | 16.94 kB | 17.06 kB     | +120 B: the kit's own handle block (limit 19 kB)                                                                  |
| Each kit's `dist/dnd.js`        | 545 B    | **578 B**    | Limit raised 560 → 660 B in **both** kits. `group`, `toDragOverEvent` and the `onDragOver` handler.               |

Both kit roots' numbers are reported because the PRD's "0 bytes added to a kit root" metric is about
`@dnd-kit` **reachability**, which is asserted separately by `bundledCodeOf` and is still 0. A kit's
own handle block is not the drag library, and phase 4 set that precedent with `RowDragHandle`.

The adapter entry overran by 18 B in both kits, which is `canDrop`'s cost on that module and nothing
else. Read it the way phase 3's docblock asks: `size-limit` excludes peers, so that number is the
adapter's own code and says nothing about what drag costs a consumer who installs `@dnd-kit/react`.

## Task 1: the probe, and its answer

The plan's first task existed because phase 4 got this question wrong twice. A throwaway test in the
heroui kit rendered a `<DataGrid.HeaderCell>` whose body called `useDataGridHeaderCell()`:

```
[PROBE] render fn args reached: id
[PROBE] useDataGridHeaderCell() reached: id
[PROBE] useDataGridHeaderCell() threw: null
```

**Reachable, both doors, no throw.** The reading behind the prediction holds: heroui's `Th` renders
`HeroTable.Column` and passes the provider as its **children**, so provider and consumer are one
React Aria collection node — unlike the row case, where the provider sat in `Tr` and the consumer in
a separate `Cell` node. So the column axis needs **no** table-level registry; a plain context
provided by the shell is enough, and `<DataGrid.ColumnDragHandle />` needs no `columnId`. The probe
was deleted.

## Findings

### The two the plan predicted from measurement — both real

**1. Neither adapter set dnd-kit's `group`, and the column axis cannot ship without it.** Every
sortable landed in one `undefined` group, and `@dnd-kit/dom@0.1.21`'s `OptimisticSortingPlugin`
sorts each group's instances by index and then asserts the i-th has `index === i`. Rows at `0..7`
beside columns at `0..4` fail that at the second position, the plugin returns early, and **both**
axes stop displacing and stop committing — `sortable.index` is never updated, so `toDropEvent` sees
no movement. `type` / `accept` gate _collisions_, not the index space. Fixed in both `dnd.tsx`, with
a test case per kit. Invisible in phase 4 by construction, since only one axis existed.

**2. Both kits' `Th` swallowed the ref `ThProps` has demanded since phase 2.** Its docblock even
predicts the symptom — "a kit that swallows it still renders correctly and still typechecks; the
affordance just never attaches". Both were plain function components, so React 19's props-spread
happens to deliver `ref` and React 18 does not. Fixed in heroui's `Th`, shadcn's `blocks/core/Th.tsx`
and the vendored `TableHead` — the last following the two `forwardRef` edits already in that file,
and named in the changeset because it reaches `npx shadcn add`.

### Three found during implementation

**3. `test:react18` caught the ref defect that React 19 hid — in the test kit.** The new
`the sortable ref lands on the header cell element` case passed on React 19 and **failed** on React
18, because `test-utils.tsx`'s `TestTh` was a plain function component too. That is the whole point
of that config existing, and it is the second time in this phase the same class of defect appeared
in a third place. Fixed; both runs are 911/911.

**4. Refusing a drop only at release is not enough, and the phase now carries the fix — for both
axes.** This began as a defect I recorded and shipped; a review pass challenged the _symptom_ I had
written, I re-measured, and the disposition changed. Worth reading in that order, because my first
account was wrong twice.

The mechanism, measured in the installed packages: `@dnd-kit/dom@0.1.21`'s `OptimisticSortingPlugin`
writes `sortable.index` for every item in the group after each displacement (`sortable.js:409-417`),
and its `dragend` restore arm opens with `if (!event.canceled) return` (`:421-423`) — **a refused
drop is not a cancelled one**, so the permuted indices stand. `@dnd-kit/react`'s assignment effect is
keyed on the index it was given (`sortable.js:61-66`), which a refusal does not change, so React
never pushes the real indices back either. The library's index space and the grid's disagree from
then on.

My first symptom — "the axis is dead until the header re-renders" — was generalised from one
observation (a chained legal drag committed nothing) without checking that `move()` yields a
_permutation_, which is still dense, so the plugin's own density gate still passes. The reviewer was
right about that and proposed the sharper consequence: a **wrong write**, since `toDropEvent` reports
the library's index while the grid resolves it against its own unchanged order. I could not reproduce
that in this example — a throwaway spec showed the DOM left as `id department joinedAt salary name`
with a duplicated cell and the next drag committing nothing, i.e. my original symptom — so I am
recording the wrong write as mechanically plausible and **not** observed, rather than adopting it as
fact. Either symptom is unacceptable, which is what settled the disposition.

**The fix is the PRD's own Could-tier invalid-drop affordance, brought forward**, and it is small
because the library supports it directly: `DragOperationManager.setDropTarget` dispatches the
`dragover` event and **returns** `event.defaultPrevented` (`@dnd-kit/abstract@0.1.21:668-677`), and
the sortable plugin reads that flag before displacing anything. So the port gained
`DndProviderProps.canDrop`, the grid answers it with `canDropColumn` / `table.ordering.canDropRow`,
and each kit's adapter calls `event.preventDefault()` in `onDragOver` — a synchronous handler, which
matters, because the plugin reads the flag in a microtask queued from the same dispatch. The commit's
guards stay exactly where they were; the change makes their refusal unreachable rather than replacing
it.

What a user now sees is better than either of the failure modes and better than a snap-back: a leaf
dragged at another group travels as far as its own group allows and **commits there**, which is what
was on screen the whole time. Both axes are covered, because `canDrop` is asked per axis and the row
arm is wired the same way — the row defect was latent rather than reachable in its docs example, and
it is closed by the same mechanism rather than left for a rework of phase 4.

One measurement came out of writing the spec for it and is worth keeping: **pointer granularity
changes the outcome.** The same `name` → `salary` drag committed nothing in two coarse
`page.mouse.move` legs and committed correctly in three finer ones, because a sortable decides its
projected position from collisions as the pointer passes each neighbour. The helper now takes three
legs, and its docblock says why. A human pointer generates far more events than either.

**5. The render-args `dragHandle` is glyph-less, in both axes.** `dragHandle` is the **shared**
control, which authors no visual because nothing in `@ez-kit/data-grid-react` may, so it renders a
`core.Button` with no children: perfectly draggable, visually empty. A kit's grip lives in its own
`blocks/ordering/ColumnDragHandle.tsx`, reachable only through the component door. This is not new —
`DataGridRowRenderArgs.dragHandle` has the same property since phase 4 — but it was not written down,
and the docs example would have shipped an invisible handle if lint had not flagged the unused
import. The example now renders the kit's component and the docblock states the split: `dragHandle`
when the call site supplies its own content or does not care, the kit's component for the kit's look.

### A defect in the row axis, found while planning, out of scope

`row.index` is the row's index **within its parent's children**, while `GridDndProvider` resolves
`table.getRowModel().rows[targetIndex]`. The two agree only on page 1 of a flat grid: on page 2
`row.index` starts at the page offset, so the density invariant above is violated and the drag
silently does nothing; with tree rows a sub-row's index duplicates a top-level one. The PRD puts
cross-page moves under `Won't` and the tree case under phase 9, so nothing was changed — but the
symptom is a drag that looks like it works and commits nothing, which deserves an issue of its own.

## What the review pass changed

Run as a separate lane, and it earned its place four times over. Recorded because the reasoning is
worth more than the diff.

- **It challenged the symptom in finding 4 and was right to.** That is what turned a filed issue into
  a fix. See finding 4 for the full account, including the part of its claim I could not reproduce.
- **It found the self-hover hole, which is the same silent class as the missing `group`, one layer
  up.** `DndDragOverEvent.targetId`'s docblock stated an adapter _obligation_ as though it were a
  property of the event — and `canDropColumn(a, a)` is `false`, so an adapter that did not filter the
  self-hover would have refused every step after the first, with no error anywhere. The grid now
  answers `true` for it before the switch, because the grid is the side that knows a self-hover asks
  no question; the adapters keep their filter, and a unit case covers both axes.
- **It caught a docblock that overstated what the code does** — the exact defect class this repo cares
  most about, and one I had written myself. My adapter comment read as though `preventDefault()`
  rejects the drop target. It does not: `setDropTarget` assigns `dragOperation.targetIdentifier`
  _before_ dispatching, and its only caller — the collision notifier — ignores the flag it returns,
  so the library documents an answer nothing in it consumes. What `preventDefault()` suppresses is
  the plugin's `move()` and the index reassignment, which is all the grid needs. Verified line by
  line before rewriting the comment, and it is _why_ the commit-time guards still earn their place.
- **It talked me out of an option I had not found, with a reason I could not have given.** Restoring
  indices unconditionally at `dragend` needs no port change at all — but the index setter calls
  `animate()` on every change, so a successful drop would run the FLIP twice and show the pre-drag
  order for however many frames sit between the restore and React's commit, an interleaving neither
  side controls. Worse behaviour for a smaller diff. Written here so nobody tries it later.

It also **withdrew** its own `onDrop: () => void | false` proposal once `canDrop` was in, on the
grounds that a second refusal channel for an unreachable residual is the speculative generality the
repo's rules push back on — and independently failed to construct the id-versus-index disagreement,
concluding the divergence is structurally confined to table state changing mid-drag. That one clause
is now in `canDrop`'s docblock.

## Deviations from the plan

- **`HeaderThProps` was needed and was not planned.** JSX admits arbitrary `data-*` attributes
  through a rule of its own; an object literal checked against `ThProps` does not. Since the header
  cell now hands its `<th>` props over as a **value**, the type needed a `data-${string}` index
  signature. Declared in `column-drag.tsx` beside the shell that consumes it.
- **The grouped-header boundary case runs in both kits, not shadcn only.** The plan expected to gate
  it on the project because heroui drops group header **rows**. It does — but the column model still
  knows each leaf's parent, and the parent is what `dropColumn` refuses on. What is missing there is
  the decoration, not the boundary.
- **The docs example wraps `id` in a header group of its own.** A top-level leaf beside grouped
  columns renders **twice** — the real header in the leaf row and a placeholder spanning the rows
  above — and both carry `data-column-id`, which made the rendered order ambiguous to read and failed
  five of seven spec cases on the first run for that one reason. Every leaf under a group appears
  exactly once.
- **The example uses the kit's `<ColumnDragHandle />` rather than the render-args `dragHandle`.**
  Finding 5.
- **The test kit's `TestTh` gained `forwardRef`.** Finding 3.
- **Spec case 7 changed meaning, and the plan's version is covered elsewhere.** Task 12 case 7 was
  "a grid with `ordering.column` off renders no handle", to be read from a second example; the spec
  asserts a **locked** column (`ordering: false`) offers none instead. The ordering-off case is
  covered by two unit cases rather than a second docs example — one asserting no handle renders, one
  asserting every column is nonetheless registered `disabled` — which is the more informative pair,
  since the DOM alone cannot show that the index space stayed dense. Recorded because the spec's case
  list no longer matches the plan's.
- **The pointer helper derives its leg count** from the number of neighbours crossed rather than
  using a fixed three. The first version used three because that is what made the measurement pass,
  which is fitting a constant to one example's distances; a longer drag would have under-sampled and
  looked like a missing commit. The mechanism is in the helper's docblock: a leg is an `await`
  boundary, and each `setDropTarget` disables the collision observer until `renderer.rendering`
  resolves, so moves arriving in between are dropped — it is legs, not `steps`, that a projection
  needs. `row-drag.spec.ts`'s two-leg helper is deliberately left alone: it is green on two
  consecutive runs and inside the 615-case suite, and editing a verified spec on a theory imports
  risk for no signal. Whoever writes the first long row drag should apply the per-neighbour rule.
- **`verify-manifest-coverage.mjs` does not run in CI** — checked rather than assumed (it is
  referenced from no workflow and no package script), so the two page-less examples cannot fail CI
  before phase 11 adds their page.

## Two corrections to my own work

- **The first browser run was 2/7 on shadcn, and my first reading of it was wrong.** The duplicated
  `id` in the rendered order looked like the drag library's mid-drag clone — the thing phase 4's spec
  needed `.first()` for. It was not: it was the placeholder header, present at page load, before any
  gesture. The distinction mattered, because the clone reading would have led to a locator fix and
  the real cause needed a change to the example's column structure.
- **My boundary case originally chained a second legal drag** to read the committed order back
  through the DOM. It failed — and failed for finding 4's reason, not the boundary's, which is
  exactly the kind of false signal that reading would have produced. The case now asserts the commit
  count and says why.

## Files changed

9 created, 21 modified.

| File                                                                     | Action |
| ------------------------------------------------------------------------ | ------ |
| `…/react/react/src/data-grid/column-drag.tsx`                            | CREATE |
| `…/react/react/src/data-grid/column-drag-handle.tsx`                     | CREATE |
| `…/react/react/src/data-grid/column-drag.test.tsx`                       | CREATE |
| `…/react/{heroui,shadcn}/src/blocks/ordering/ColumnDragHandle.tsx`       | CREATE |
| `apps/docs/shared/data-grid/examples/components/column-drag.tsx`         | CREATE |
| `apps/docs/e2e/packages/data-grid/ordering/column-drag.spec.ts`          | CREATE |
| `.changeset/dnd-header-drag.md`                                          | CREATE |
| `…/react/react/src/data-grid/header-cell.tsx`                            | UPDATE |
| `…/react/react/src/data-grid/data-grid.tsx`                              | UPDATE |
| `…/react/react/src/{index.ts,test-utils.tsx,package.json}`               | UPDATE |
| `…/core/src/messages/{types,defaults}.ts`                                | UPDATE |
| `…/react/{heroui,shadcn}/src/{dnd.tsx,dnd.test.tsx,index.ts,styles.css}` | UPDATE |
| `…/react/heroui/src/blocks/core/table-adapters.tsx`                      | UPDATE |
| `…/react/shadcn/src/blocks/core/Th.tsx`                                  | UPDATE |
| `…/react/shadcn/src/components/ui/table.tsx`                             | UPDATE |
| `apps/docs/shared/data-grid-dnd/handle.tsx`                              | UPDATE |
| `apps/docs/shared/data-grid/examples/{manifest.json,registry.ts}`        | UPDATE |

## Notes for phase 6

The header's index space is `getVisualLeafColumns(table)` under `ColumnMoveScope.Visible`. The
visibility panel is the same `axis: 'column'` but a **different** space — every leaf column, hidden
ones included, under `ColumnMoveScope.All` — so the two surfaces cannot share one `group` without
breaking density the moment both are mounted. Phase 6 needs either its own group value or a decision
that the two are never draggable at once, and the `case DragAxis.Column` arm will have to learn which
surface a drop came from. This is a real constraint, not a tidiness question, and finding 1 is why.

# Plan: DnD Phase 9 — Virtualized row drag

## Summary

Row dragging does not work in a virtualized grid, and the reason is not the one the PRD's phase
description implies. Two defects stack, and only the second is about a row disappearing:

1. **Density.** A virtualized body renders a window, and each rendered row registers its position in
   the **whole** row model. Rows 5…20 therefore register indices `5…20`, and
   `@dnd-kit/dom@0.1.21`'s `OptimisticSortingPlugin` sorts a group's sortables and asserts the i-th
   has `index === i` (`sortable.js:378-383`). The zeroth has `5`. The plugin returns on the first
   frame: no displacement, no commit, no error. **The axis is dead before anything unmounts.**
2. **Unmounting.** Once that is fixed, dragging a row out of the window unregisters it mid-gesture,
   which puts a hole in the space and kills the drag part-way through.

This phase fixes both, in that order, and the order matters: fixing (2) alone changes nothing
observable, so a plan that starts there cannot tell success from failure.

Requirement 1 of the PRD's four ("`index` is the real row index") is **already done** and shipped as
a separate fix — it was a live defect in the _non_-virtual grid too (page two, any column filter, tree
rows). This plan is requirements 2–4.

## User Story

As a developer with a 10 000-row grid, I want a user to drag a row a few places, so that the one
affordance that makes reordering usable is not the one that silently does nothing on exactly the
grids big enough to need it.

## Problem → Solution

| Problem                                                           | Solution                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Windowed rows register whole-model indices → space is never dense | Index by position in the **rendered** list, published by whoever renders the rows    |
| The dragged row unmounts when it leaves the window                | The row records itself as active while `isDragging`; the body keeps rendering it     |
| A commit resolves `targetIndex` against the wrong list            | `GridDndProvider` reads the same published list the row indexed itself in            |
| The virtualizer keys rows by window position                      | `getItemKey` by row id, so identity survives the commit                              |
| Auto-scroll has no declared scrollport                            | The `core.TableScroll` slot's `ref` — no longer an open question, phase 5 decided it |

## Metadata

- **Complexity**: Large. Touches the row, both bodies, the registry, the provider and the port's
  docblock, plus a new example and spec.
- **Confidence**: 5/10 — lower than any previous drag phase, and Task 1 exists to raise or kill it.
  The uncertainty is not in the code; it is whether the library tolerates an index space that
  **changes size and membership mid-drag**, which is what auto-scroll does and what no previous phase
  has asked of it.
- **Risk**: The phase can fail at Task 1 and should then stop.

## Mandatory Reading

- `packages/data-grid/react/react/src/data-grid/dnd/types.ts` — `DragSpec.index`, whose docblock says
  "never a position within a rendered window". **This plan reverses that sentence**; read why it was
  written before rewriting it.
- `packages/data-grid/react/react/src/utils/row-drop-order.ts` — the list today, and why it is the
  three bands rather than the row model.
- `packages/data-grid/react/react/src/data-grid/virtual-body.tsx` — `virtualItems.map` at `:109`,
  and the top/bottom bands rendered outside the window at `:100` and `:122`, which is the pattern
  Task 3 reuses.
- `packages/data-grid/react/react/src/data-grid/row-drag-registry.tsx` — the table-level store, why
  it writes during render, and why a handle subscribes per row.
- `.claude/PRPs/reports/dnd-phase-6-panel-drag-report.md` — findings 1 and 5. Finding 1 is the density
  rule; finding 5 is the registry-keyed-by-id rule, which this phase must not break when a held row
  and a windowed row are both mounted.

## Patterns to Mirror

### OUT_OF_WINDOW_ROW

`virtual-body.tsx:100,122` renders the pinned bands outside the virtualizer's range already. The held
row is the same move with a different reason, and must reuse it rather than introducing a
`rangeExtractor` — there is none anywhere in the repo, and the PRD's open question preferred the
existing mechanism.

### ONE_LIST_TWO_READERS

`getRowDropOrder` / `getVisibilityPanelColumns`: the list a surface indexes itself in and the list a
drop resolves against are one function, because two copies are how they drift. This phase keeps that
and only changes where the list comes from.

### DRAG_STATE_IS_DERIVED_NOT_RAW

`row.tsx` reads `drag`, never `sortable`, so a row that cannot be picked up cannot be reported as
dragging. The active-row record must be derived the same way, or a disabled row could pin itself
active forever.

## Step-by-Step Tasks

### Task 1: Probe — does the axis come alive with rendered-list indices?

**This is the whole gate. Nothing else in this plan is worth writing until it answers.**

- **IMPLEMENT**: In a throwaway branch of `row.tsx`, index a row by its position among the rows the
  body currently renders rather than in `getRowDropOrder`. The crudest correct version is enough: in
  `VirtualBody`, build `[...topRows, ...windowRows, ...bottomRows].map(r => r.id)`, publish it on a
  context, and have `row.tsx` use `indexOf`. Add a drag handle column to the `virtualized` docs
  example and drive it with a throwaway spec modelled on `row-drag.spec.ts`.
- **MEASURE, in this order**:
  1. Does a row displace its neighbours at all? (Today: no.)
  2. Does a short drag — three or four rows, entirely inside the window — commit?
  3. What happens when the pointer reaches the edge and the grid auto-scrolls: does the operation
     survive the window changing under it, or does it die?
- **GOTCHA**: Measurement 3 is the one that decides the phase's scope, and it is the one with no
  precedent. The window changing means sortables unregistering and registering _during_ an
  operation, with every remaining index reassigned. `OptimisticSortingPlugin` re-reads the group on
  every `dragover`, so it may simply cope; it may also bail the moment the set changes. Record what
  happens rather than what should.
- **GOTCHA**: Do not fix the unmounting problem here. If measurement 2 passes, the dragged row has not
  left the window yet, so Task 3 is not needed to see a commit.
- **VALIDATE**: the throwaway spec, run twice. Then **delete the probe** and record the three answers
  in the report — the plan's remaining tasks are written assuming "yes, yes, unknown".
- **STOP CONDITION**: if measurement 1 or 2 fails, stop and report. The remaining tasks cannot rescue
  it, and the honest outcome is that virtualized drag needs a different mechanism than this library's
  sortable — which is a PRD-level decision, not an implementation one.

#### GATE RESULT — measured, probe deleted, spec run twice with identical output

**1. Displacement: YES.** With rendered-list indices the axis comes alive on the first frame.
`data-row-dragging` goes `true` and neighbours displace — `1,2,2,3,4,5` → `1,3,2,2,4,5`. So the
density diagnosis was right and the fix is the right shape.

**2. In-window commit: YES.** Dragging row 2 onto row 5 commits: `1,2,3,4,5,6` → `1,3,4,2,…`.

**3. Survival of auto-scroll: NO — and the first reading of this was wrong.** The window moved
(`1…19` → `3,22,23,…,52`) and the probe reported the source "still mounted", which looked like Task 3
being unnecessary. It is not. Two further measurements killed that reading:

- The surviving element carrying `data-row-id="3"` has **`__reactFiber$` absent** — it is a
  **dnd-kit clone**, not React's row. React unmounted the source exactly as predicted; the clone is
  drag feedback and kept the failure invisible. **A DOM presence check cannot answer this question**;
  ownership must be checked, which is why this note names the technique.
- Walking the committed list from the top, row 3 landed at **position 0** — `3,1,2,4` — after a
  downward drag toward row ~35. So the operation does not die, it **commits to the wrong index**,
  which is worse than dying.

The mechanism joins this phase to the deferred finding #4: the source unmounts, so it is no longer in
the published rendered list, `indexOf` returns `-1`, and `Math.max(dropIndex, 0)` clamps that to `0`
— the top of the grid. The clamp is what converts "the dragged row vanished" into "the row silently
teleports to row 1".

**Consequences for the rest of this plan**, all of which is now written against measured facts rather
than "yes, yes, unknown":

- **Task 3 is the crux of the phase, not an optional hardening step.** Without it there is no
  correct long drag at all.
- **Task 5's spec scope is the long drag** — the PRD's "index 5 → index 400" is reachable in
  principle, but it is reachable _only_ through Task 3, and the spec must assert the landing
  **position**, never merely that the source left its old one. Both earlier probes would have passed
  a "the row moved" assertion while the row was teleporting to the top.
- **The `-1` path needs a guard here rather than a clamp**, or Task 3 regressing turns back into a
  silent wrong landing instead of a visible failure.

### Task 2: The rendered-row list becomes the published one

- **IMPLEMENT**: A `RenderedRowsProvider` (or an addition to the row-drag registry — decide in the
  task, one provider is better than two) carrying the ordered row ids currently in the DOM.
  `Body` publishes `[...topRows, ...centerRows, ...bottomRows]`; `VirtualBody` publishes
  `[...topRows, ...windowRows, ...bottomRows]`. `getRowDropOrder` reads the published list, falling
  back to today's derivation when nothing published — which is what a hand-written body gets.
- **MIRROR**: ONE_LIST_TWO_READERS.
- **GOTCHA**: `row.tsx` must not read a list that changes identity every render, or every row
  re-registers on every scroll frame. Publish ids, memoised on the joined key.
- **GOTCHA**: `GridDndProvider`'s row arm resolves `targetIndex` through the same helper, so it needs
  the published list too. It sits **above** the body, so the provider has to be above it as well.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react test` — the two new cases in `row-drag.test.tsx`
  (page 3, filter) still pass, because for a non-virtual body the published list is what they already
  assert.

### Task 3: Hold the dragged row mounted

- **IMPLEMENT**: The row records itself as the active drag in an effect keyed on `isDragging`, and
  clears it when `isDragging` goes false. `VirtualBody` renders the active row when it is outside the
  window, positioned by the virtualizer's offset for its real index.
- **MIRROR**: OUT_OF_WINDOW_ROW, DRAG_STATE_IS_DERIVED_NOT_RAW.
- **GOTCHA**: **Cancellation needs no separate path, and that is the design's one elegant part.** A
  cancelled drag fires no `onDrop`, so clearing on commit would leak — but the held row is still
  mounted, so its `isDragging` goes false and it clears itself. Do not add an `onDragEnd` to the port
  for this.
- **GOTCHA**: The held row must keep the index it had, or the space loses density the moment it is
  held. It is in the published list by construction if the list is built as "window plus the active
  row", so build it that way rather than appending.
- **GOTCHA**: One id, one registration. A row that is both in the window and held must render once.
- **VALIDATE**: unit cases that a held row stays in the published list and keeps its index.

### Task 4: `getItemKey`, and the scrollport for auto-scroll

- **IMPLEMENT**: `getItemKey: (index) => rows[index]?.id ?? index` on the virtualizer
  (`table.tsx:180-188`); point dnd-kit's auto-scroller at the element the `core.TableScroll` slot's
  `ref` lands on.
- **GOTCHA**: The PRD lists the scrollport as an open question with two candidates. It is not open any
  more — phase 5's slot contract made the `ref` the declaration, and `table.tsx` already picks
  `containerRef` in virtualized mode. Cite that rather than re-deciding.
- **VALIDATE**: the virtualization spec (`virtualization.spec.ts`) still passes — `getItemKey` changes
  how rows are keyed and is the likeliest thing to disturb it.

### Task 5: Example, spec, docs, changeset

- **IMPLEMENT**: a `virtualized-row-drag` example; a spec whose scope is **whatever Task 1's
  measurement 3 established** — a within-window drag if auto-scroll does not survive, a long drag if
  it does. Update the drag page's "Not built yet" entry and `DragSpec.index`'s docblock. Changeset on
  `@ez-kit/data-grid-react`.
- **GOTCHA**: The PRD's success criterion is "index 5 to index 400". If measurement 3 said no, the
  criterion is not met and the PRD must say so rather than the spec being written to look like it was.

## NOT Building

- **A `rangeExtractor`.** OUT_OF_WINDOW_ROW is the existing mechanism and the PRD preferred it.
- **Column virtualization.** Not built anywhere; out of scope by the PRD.
- **A port change.** The dragged row is mounted when the drag starts, so it can record itself. No
  `onDragStart` on `DndProviderProps`.
- **Cross-page drag.** `Won't` in the PRD, unchanged.

## Open Question — CLOSED by Task 1

Whether the index space may change size mid-drag. **It may.** `OptimisticSortingPlugin` re-reads the
group on every `dragover` and copes with the window's membership being reassigned under it — the drag
kept displacing neighbours across an auto-scroll that replaced the entire window. What it does _not_
tolerate is a **hole**: the dragged row's own registration leaving the space. That is one specific
defect with one specific fix (Task 3), not the library refusing the whole idea, so the phase's promise
is the PRD's promise and no narrowing is recorded here.

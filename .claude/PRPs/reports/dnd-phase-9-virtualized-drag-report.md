# Report: DnD Phase 9 — Virtualized row drag

Row dragging works in a virtualized grid. Four defects were involved, not the two the plan
predicted, and the two it did not predict were both found by refusing to accept a green reading.

## What the gate measured, and how its first reading was wrong

Task 1 was a throwaway probe, run twice, then deleted. Its three questions came back **yes, yes,
no** — but the third was first read as "yes", and the correction is the most useful thing in this
report.

The probe asked whether the drag survives the window changing under it, and reported the source row
"still mounted" after auto-scroll had moved the window past it. That looked like the plan's Task 3
being unnecessary. Two further measurements killed it:

- The surviving element carrying the source's `data-row-id` has **no `__reactFiber$`** — it is a
  **dnd-kit clone**, not React's row. React unmounted the source exactly as predicted; the clone is
  drag feedback and kept the failure invisible. **A DOM presence check cannot answer this question**;
  ownership has to be checked.
- Walking the committed list, the dragged row had landed at **position 0** — the top of the grid —
  after a downward drag toward row ~35.

So the drag did not die, it **committed to the wrong place**, which is worse. The mechanism joins the
deferred `Math.max(dropIndex, 0)` finding: the source unmounts, leaves the published list,
`indexOf` returns `-1`, and the clamp turns that into `0`.

Note the repo already knew the clone exists — `row-drag.spec.ts` documents it and uses `.first()`
for exactly that reason. The probe's error was not missing a fact; it was accepting a DOM reading as
an answer to a question about ownership.

## The four defects

1. **Density.** A windowed body renders a slice while every rendered row registered its position in
   the whole row model, so the zeroth sortable of a window starting at row 5 claimed index `5`.
   `OptimisticSortingPlugin` requires exactly `0..n-1` and bails on the first frame otherwise,
   silently. Fixed by having a virtualized body **declare** the rows it renders
   (`usePublishRenderedRows` / `useRenderedRowIds` / `getRowDropIndex`). The non-virtual body
   declares nothing and keeps the derivation, because its rendered set _is_ that derivation.
2. **Unmounting.** The dragged row now records itself as the active drag and the body keeps it
   mounted, built into the list as "window plus held row" at its index-sorted place rather than
   appended. Cancellation needs no extra path: a cancelled drag fires no `onDrop`, but the row is
   still mounted _because_ it is recorded, so its own `isDragging` going false clears it.
3. **An index-based drop is not sound across a window change.** Instrumented on shadcn, three runs:
   the id the pointer was over at release was correct every time (published position 15), while the
   drop event's `targetIndex` was 18 or 19 — the library's index space is longer than the list the
   grid resolves against by however many rows scrolled past, and the row landed 3–4 places late.
   `DndDropEvent` is now `{ axis, surface, sourceId, targetId }` with no index.
4. **"Did the item move" could not be answered by indices.** `index === initialIndex` compares
   numbers measured against **different lists** — `initialIndex` frozen at drag start
   (`@dnd-kit/dom/sortable.js:556-566`), `index` rewritten every frame by React's layout effect
   (`@dnd-kit/react/sortable.js:61-67`) with no guard for an operation in flight. Reachable shape:
   the first row dragged far down, where the held row sorts back to published position `0`, so a
   move of hundreds of rows was **silently refused**. Replaced by a neighbour-id anchor.

## Two instructions of mine that were wrong, and were corrected by measurement

Recorded because both would have shipped a defect, and in both cases the implementer brought
evidence before writing code rather than after.

- **"Both kits already have the target id; reading it is less work than an index."** False.
  `OptimisticSortingPlugin` ends every successful displacement with `setDropTarget(source.id)`
  (`@dnd-kit/dom@0.1.21/sortable.js:419`), and collisions do not exclude the source's own droppable,
  whose element follows the pointer — so `operation.target.id` **degenerates to the source** on every
  ordinary drag, and every pre-existing fixture in both kits encodes that. The three runs where it
  was correct were the frames where the plugin had _bailed_. Taking it literally would have refused
  every short drag as a self-drop. The adapter instead reports the last target the pointer was over
  that the grid allowed.
- **"Record the anchor on every _allowed_ `dragover`."** False. A `dragover` listener runs _before_
  that frame's displacement — the plugin queues it (`sortable.js:373`, `queueMicrotask` →
  `renderer.rendering.then`) and then calls `setDropTarget(source.id)` (`:419`), which dispatches a
  further `dragover`. Recording only on allowed hovers would lag one move and refuse every
  single-step drag. The anchor is recorded on **every** hover, before the `canDrop` gate; the
  self-target frame is the one whose registry reflects the displacement.

A third correction went the other way: a review finding claimed `ordering.dropRow` never enforces the
sub-row limit. It does — the guard sits in the shared `commit` (`row-ordering-feature.ts:160`) that
the `dropRow` member hands its move to (`:212`), on the uncontrolled path only, which matches the
documented behaviour that controlled mode has no such limit. The finding came from a grep that
attributed the line to the member below it. Only the clause "where `isTopLevelRow` lives" was false;
the docblock was corrected and **no check was added**.

## Known residual, documented rather than engineered around

The displacement chain is gated on `renderer.rendering.then`, i.e. at least one frame. Inside the
microtask nothing can interleave, so the self-target frame is guaranteed there. But a release
arriving **before that promise settles** leaves the recorded anchor one move stale: a single-step
drag released sub-frame is silently refused, and a drag returned to its origin and released
sub-frame commits a spurious one-row move. Multi-step drags are unaffected. The window is about one
frame of release latency — rare for a human, plausible for synthetic input.

Not fixed, and the reason is in the docblock: ORing the recorded anchor with a freshly computed one
closes the refusal direction but not the spurious-commit direction, and ANDing them reintroduces the
refusal. There is no cheap arrangement that closes both.

## Also left unfixed, deliberately

- `Math.max(dropIndex, 0)` in `row.tsx`. The structural fix is splitting `DataGridRow` in two, which
  the owner deferred; a `-1` breaks density just as a duplicate `0` does, so there is no better
  arithmetic. A development error now reports the state it papers over, per grid.
- `canMove` flipping false mid-drag drops the record and unmounts the held row — the hole this phase
  closes, reachable only by a config change during a gesture. Reading the derived `drag` rather than
  the raw sortable is still right.

## Verification

Unit coverage was mutation-probed in both directions rather than assumed: disabling the hold fails
the four held-row cases; making `getRowDropIndex` ignore the published list fails nine; making the
drop-side reader ignore it fails five, the clean complement of the second. Restoration was by
backup copy and `diff`, never `git checkout --`, because the tree carried uncommitted work that a
checkout would have destroyed along with the mutation — and a suite green against the _old_
implementation would have invalidated every probe.

`getItemKey`'s stable identity rests on `rows` keeping its identity across a scroll, which holds
because `getCenterRows` is memoized **in its attachment** (`memoDeps`), not in the util — the raw
`table_getCenterRows` is a bare `.filter()` returning a fresh array. Worth knowing before editing
near that line.

The `dist/dnd.js` budget moved 820 B → 1.25 kB in both kits, measured 744 B → 1.11 kB. The growth is
the adapter's own: every deletion in this change is in `@ez-kit/data-grid-react`, which that entry
`ignore`s. Raised with the figure, never silently.

## Gate results

Measured on the finished tree, not taken from a sub-task's report.

- `pnpm run ci` (lint → typecheck → test → build → size): **30/30 tasks, exit 0**. `@ez-kit/data-grid-react` 977 tests, core 797, shadcn 108, heroui 124, docs 210.
- `@ez-kit/data-grid-react` under React 18: **977/977**.
- `pnpm size`: in budget everywhere. `dist/dnd.js` measured **1.11 kB** against a budget raised 820 B → 1.25 kB, with the figure stated rather than the limit moved quietly.
- Full browser suite, both kits: **967 passed, 2 skipped, 0 failed**. The drag directory is green on both kits across repeated runs, and the one-step threshold case counts as an expected failure.

## The browser suite measures the dev server, not only the tree

Worth more than the phase it was found in. A full-suite run finished with **10 failures** — five specs across both kits, none of them about dragging — and two successive diagnoses of it were wrong:

1. A baseline taken in an isolated worktree answered "they pass at HEAD", but that worktree sat on a commit **55 commits away on a different line of history**, not the branch tip. Caught by comparing its own `git log` against the branch, not by doubting the table it produced.
2. A second comparison — the same three spec files, branch tip versus working tree — showed 42 passed against 5 failed, which looked conclusive. It was not: **Playwright reuses an already-running dev server locally**, so the working-tree run reached a long-lived server while the worktree started a fresh one.

The actual cause was that server's cache. An experiment that briefly added `@dnd-kit/collision` had been reverted in both source and `dist`, but Turbopack still held the failed module resolution, so Next.js rendered its error indicator over the top-left of every example — exactly where those five specs click first. `locator.click` then timed out against `<nextjs-portal>`.

Nothing in `lint`, `typecheck`, `test`, `build` or `size` can see this: it is visible only in the browser console. After killing the server and deleting `.next` / `.source`, the same three files passed 42/42 and the full suite went green with no code change.

**The rule this leaves behind:** after any experiment that touched dependencies, run the browser suite with the dev server killed and `.next` removed, or it answers for a tree that no longer exists.

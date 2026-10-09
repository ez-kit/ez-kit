# Why a virtualized row's neighbours do not move aside — findings

The spec behind `2026-10-06-flow-windowing-virtual-body.md`. Everything here was measured, not
reasoned: each number comes from driving a real pointer against a real page, either the docs app or
an isolated spike. Where an earlier explanation turned out to be wrong, the wrong one is recorded
beside the right one, because the wrong one is the plausible-sounding answer a later reader will
arrive at on their own.

## The report

In the docs' virtualized drag example (`/docs/data-grid/drag-and-drop#in-a-virtualized-body`),
dragging a row over its neighbours shows no displacement: the rows the pointer passes over do not
move aside. The non-virtualized example on the same page does show it.

## What the mechanism actually is

`@dnd-kit`'s sortable displacement is **not** a transform it writes on the neighbours. On `dragover`,
`OptimisticSortingPlugin` calls `reorder(sourceElement, …, targetElement, …)`, which is
`targetElement.insertAdjacentElement(position, sourceElement)` —
`@dnd-kit/dom@0.1.21/sortable.js:478`. It then assigns each sortable's `index`, whose setter runs
`Sortable.animate()` (`sortable.js:616`), a FLIP: it diffs each element's stored
`boundingRectangle` against a fresh one and animates `translate` across the difference.

So displacement is **a DOM reorder plus an animation of the layout change that follows**. Where there
is no layout change, there is nothing to animate.

## Measurement 1 — the two bodies, same gesture

Drag row `3` three places down; `top` in viewport px, sampled mid-gesture.

`/examples/shadcn/row-drag` — rows in normal flow:

| id  | before | during  |
| --- | ------ | ------- |
| 4   | 233    | **184** |
| 5   | 282    | **233** |

`/examples/shadcn/virtualized-row-drag` — rows `position: absolute` with `transform: translateY()`:

| id  | before | during |
| --- | ------ | ------ |
| 4   | 205    | 205    |
| 5   | 254    | 254    |

The DOM order became `1,2,4,5,3` in **both**. Only the in-flow body moved.

## Measurement 2 — the isolated spike

An isolated Vite app on the repo's own versions (React 19.2.5, `@tanstack/react-virtual` 3.13.24,
`@dnd-kit/{react,dom,helpers}` 0.1.21), five columns sharing one `useSortable` call site over 1 000
items, with none of this repo's code. Drag three places down; `y` relative to each column's own
scrollport.

| variant                                                              | before                   | during                     |
| -------------------------------------------------------------------- | ------------------------ | -------------------------- |
| C · no window at all                                                 | `3@97 4@145 5@193 6@241` | `4@97 5@145 6@193` ✔       |
| B · window, in flow, spacer offsets, commit on `dragOver`            | same                     | `4@97 5@145 6@193` ✔       |
| A · window, `absolute` + `transform`, commit on `dragOver`           | same                     | `4@97 5@145 6@193` ✔       |
| D · window, `absolute` + `transform`, commit on drop — **this repo** | same                     | `4@145 5@193 6@241` ✘      |
| A′ · as A, with the held row's slot frozen at pickup                 | same                     | `4@97 5@145 6@193 7@244` ✔ |

All five committed the order correctly (`1,2,4,5,6,3`). The difference is only the feedback.

**The first explanation was wrong.** It said absolute positioning makes the DOM reorder inert, so the
FLIP has nothing to animate, so displacement is impossible out of flow. Variant A falsifies the last
step: same absolute layout, same FLIP, and the neighbours move — because the data reorders mid-drag
and the virtualizer reassigns its slots to the new order. The deciding variable is **when the order
is committed**, not how a row is positioned.

Two regimes, then:

- **in flow** — the library's own DOM reorder changes layout, so displacement is free and needs no
  optimistic state. This is why the non-virtualized grid has it.
- **out of flow** — the DOM reorder changes nothing, so displacement requires the _rendered order_ to
  change.

## Measurement 3 — why the optimistic path is the expensive one

Variant A is visibly broken: the dragged element runs away from the cursor at twice the pointer's
speed, because its position is the sum of two writers.

| pointer +dy | inline `transform` (the slot) | `translate` (the library) | visible y |
| ----------- | ----------------------------- | ------------------------- | --------- |
| 42          | `translateY(144px)`           | 42                        | 187       |
| 78          | `translateY(192px)`           | 78                        | 271       |
| 114         | `translateY(192px)`           | 114                       | 307       |
| 150         | `translateY(240px)`           | 150                       | **391**   |

Variant A′ fixes it by freezing the held row's slot at pickup (`translateY(96px)` on every frame,
y = 96 + dy → 139, 175, 211, 247) and matches variant B frame for frame. So the optimistic path works
— but only together with that freeze, and it costs: a new drag-port member for the hover
notification (`canDrop` is a predicate and `announcements.dragOver` returns a string, so neither is a
channel), both kits' adapters, a write to `ordering` on every hover frame, and every intermediate
order made visible to a controlled grid's `onOrderChange`.

Flow windowing buys the same behaviour with none of that. That is why the plan implements B.

`Escape` reverts correctly in both variants, by the library's own cancel path — measured, so the
optimistic path's hardest-looking requirement was not the thing that ruled it out.

## Measurement 4 — flow windowing on this repo's grid

A throwaway edit to `virtual-body.tsx` and the structural stylesheet: `paddingTop` /
`paddingBottom` on the tbody, no per-row transform. Reverted afterwards.

Geometry held across the whole 10 000-row list:

| `scrollTop` | `paddingTop` | first mounted row | `scrollHeight` |
| ----------- | ------------ | ----------------- | -------------- |
| 0           | `0px`        | 1                 | 490 041        |
| 4 900       | `4 410px`    | 91                | 490 041        |
| 49 000      | `48 510px`   | 991               | 490 041        |
| 245 000     | `244 510px`  | 4 991             | 490 041        |

And the drag gained its displacement: `before 3@140 4@189 5@238` → `during 4@140 5@189 6@238 3@287` →
`after 1,2,4,5,6,3,7`.

## Measurement 5 — what flow windowing breaks

Running the repo's own `virtual-row-drag.spec.ts` against that edit, `--project=shadcn`: 3 passed,
3 failed. Each failure is informative.

1. **`a one-step drag past the neighbour is lost by the drag library` — "Expected to fail, but
   passed."** That case is a `test.fail()` documenting a limitation. Flow windowing removes the
   limitation. The adapter docblock blamed the drag library; the geometric explanation in the same
   docblock — the dragged row's rect travels with the pointer while its neighbours' stay put — was
   right, and it is a consequence of this repo's positioning, not of anything upstream. The spike
   confirms it independently: at one step, every windowed variant commits above the target row's
   centre and refuses below it, which is exactly `mutate`'s `position.y > target.shape.center.y`.

2. **Both far-drag cases failed**, one with "the far region rendered no visible row to drop onto".
   Two separate causes:
   - `committedIndexOf` (`virtual-row-drag.spec.ts:113-137`) reads a row's index out of
     `getComputedStyle(row).transform`'s `m42`. In flow there is no transform. A test coupling, not a
     product failure.
   - A real product defect. During a drag with auto-scroll, `paddingTop` stayed `0px` while
     `scrollTop` climbed to 1 410, and the tbody's height fell 490 000 → 489 902 → 489 755 → 489 461
     → 489 167 over six frames, with the visible row count collapsing to 3. Cause: `centerEntries` is
     "the window **plus** the row being dragged", and the held row joins it at its model index — so a
     held row near the top of the list becomes `centerEntries[0]`, its `start` of 0 silences the top
     pad, and its `size` corrupts the bottom one. Fix: compute the pads from the window alone, and
     render an out-of-window held row out of flow. That row must stay mounted either way — unmounting
     it puts a hole in the index space the library requires to be `0..n-1`, which is the defect
     `useActiveDraggingRow` exists to prevent.

At rest, after one `requestAnimationFrame` at `scrollTop=4900`, 29 rows were mounted and 7 were
inside the scrollport — so the spec's settle is adequate and was not a factor.

## Known unknowns the plan has to close

- **Row pinning with virtualization is combined nowhere in this repo** — no example, no unit test, no
  spec. Checked by grepping the example components for both. Pinned rows share the tbody with the
  window, and container padding applies before them, so the band is expected to be offset by
  `pads.before + pinnedTopHeight`. Task 4 measures it and, if confirmed, moves the offset onto the
  band's edge rows as margins. Spacer **elements** are not available: the heroui kit's `Tbody` is
  React Aria's `TableBody`, which silently drops a child that is not a collection item.
- **The heroui kit was not measured at all.** Its scrollport is a different element (the kit hoists
  `Table.Root` + `Table.ScrollContainer` into its `TableScroll` slot) and its stylesheet carries its
  own virtualized-mode rules.
- **The infinite loader's three states** were not measured under flow. The fixed
  `LOAD_MORE_ALLOWANCE_PX = 56` that reserved its space becomes unnecessary when the row is in flow,
  but "unnecessary" is a prediction until a wrapping error message is looked at.
- **RTL** was not measured in either arrangement.

## Artifacts

The spike lives in the session scratchpad at `spike-vv` (a Vite app, `pnpm dev`, five columns). It is
outside the repository and will not survive the session; its numbers are above, which is what the
plan argues from. Nothing in the repository was left modified by any measurement here.

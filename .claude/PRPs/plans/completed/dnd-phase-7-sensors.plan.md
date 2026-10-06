# Plan: DnD Phase 7 — Keyboard + touch sensors

## Summary

The PRD's framing — "add keyboard and touch sensors" — is **already false**, and the survey that
established that is the reason this plan is small and specific rather than a sensor implementation.

`@dnd-kit/dom@0.1.21`'s `defaultPreset` is `sensors: [PointerSensor, KeyboardSensor]`
(`index.js:1822`), and neither kit passes a `sensors` prop, so **a keyboard sensor has been live
since phase 4**. Its `shouldActivate` is already handle-only — `event.target === (source.handle ??
source.element)` (`index.js:1356`) — which is the activator discipline the PRD asks for, enforced by
the library rather than by us. Touch already carries a 250 ms delay with a 5 px tolerance
(`index.js:1544`).

What is actually missing is three things, one of them a live defect:

1. **`Alt+Arrow` is handled twice during a keyboard drag.** `use-keyboard-navigation.ts` returns on
   `event.altKey` at `:213`, **before** it checks whether a drag is in flight at `:218`. So while a
   keyboard drag is running, `Alt+ArrowDown` reaches both `row.tsx`'s reorder handler and dnd-kit's
   `down` key. Both act. This is exactly the collision the phase's success criterion names, and it
   is in the code today.
2. **A mouse drag from the handle has no threshold at all.** The pointer sensor's constraint is a
   function, and its first branch returns `undefined` for a mouse whose target is the handle
   (`index.js:1529-1532`) — no distance, no delay. Every other path gets one. The PRD asks for a
   named distance threshold; today there is not even an anonymous one.
3. **Every threshold in play belongs to the library, not to us.** 250 ms, 5 px, 10 px — all
   `@dnd-kit` defaults, i.e. numbers that can change in a minor release and silently change how the
   grid feels. The PRD's "named constants" is not cosmetics; it is removing a dependency on someone
   else's default.

## User Story

As a keyboard user, I want to pick a row up with the handle and move it without the grid also
reordering underneath me, so that one keystroke does one thing.

## Problem → Solution

| Problem                                             | Solution                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `Alt+Arrow` acts twice during a keyboard drag       | Check the drag gate **before** the `altKey` return                         |
| A mouse drag from the handle starts on any movement | An explicit sensor configuration with a named distance                     |
| The gesture's feel is `@dnd-kit`'s defaults         | Named constants in each kit's `dnd.tsx`, passed explicitly                 |
| Nothing asserts that navigation stands down         | A unit case that renders a dragging row and asserts the nav handler yields |
| No spec drives four keyboard consumers in one grid  | The phase's success criterion, as one spec                                 |

## Metadata

- **Complexity**: Small-to-medium. One ordering fix, one sensor block per kit, two tests.
- **Confidence**: 8/10 — higher than phase 9 because the survey replaced every assumption with a
  `file:line`. The uncertainty is in `Tab`, below.
- **Risk**: Reordering two guards in the navigation module touches every grid's keyboard, not only
  dragging ones. That is what `keyboard-navigation.test.tsx`'s 11 existing cases are for.

## Mandatory Reading

- `packages/data-grid/react/react/src/data-grid/keyboard-navigation/use-keyboard-navigation.ts` —
  `:30-33` (why `Escape` is deliberately **not** handled here), `:97-139` (`applyTabStop`), `:213`
  and `:218` (the two guards this plan reorders), `:245-287` (the key switch).
- `packages/data-grid/react/shadcn/src/dnd.tsx` — the `const` block at `:61-69`
  (`DRAG_KEY_SEPARATOR`, `DRAG_AXES`, `DRAG_SURFACES`), which is where the new constants belong, and
  `<DragDropProvider>` at `:626`, which is where sensors go.
- `node_modules/@dnd-kit/dom/index.js` — `:1822` (the preset), `:1340-1356` (keyboard defaults),
  `:1528-1549` (the pointer constraint function). Read these before changing a number: the defaults
  are the baseline any new constant is judged against.

## Patterns to Mirror

### BOTH_KITS_BYTE_IDENTICAL

`shadcn/src/dnd.tsx` and `heroui/src/dnd.tsx` are byte-identical below their header docblocks, and a
`shasum` of each file from its first post-docblock line is how that is checked. Every change here
lands in both, verified that way.

### CONSTANTS_LIVE_WHERE_THE_LIBRARY_IS_NAMED

`dnd.tsx` is the only module in the repo that names a drag library, so sensor tuning lives there.
**Not** `defaults.ts`: `DATA_GRID_DEFAULTS` is the resolved-config bag, every member of which a
consumer can override through `TableConfig`, and publishing a number there that no config reads is
the "option that silently does nothing" defect the navigation module's own docblock warns about.

## Step-by-Step Tasks

### Task 1: Reorder the two guards, and prove the order matters

- **IMPLEMENT**: in `use-keyboard-navigation.ts`, move the `DRAGGING_SELECTOR` check above the
  `event.altKey` return. Comment why the order is load-bearing in both directions: the drag layer
  owns every key while a drag is in flight, **and** `altKey` must still return early when no drag is
  running, or `Alt+Arrow` stops reaching the row and header handlers that own it.
- **VALIDATE**: the 11 existing cases in `keyboard-navigation.test.tsx`, plus
  `row-ordering-keyboard.test.tsx` and `ordering.test.tsx`'s header cases — those are what prove
  `Alt+Arrow` still works when nothing is being dragged.
- **GOTCHA**: do not "simplify" the two guards into one condition. They answer different questions
  and one of them is about a DOM query, which is the expensive one and must stay second.

### Task 2: Name the constants and pass the sensors explicitly

- **IMPLEMENT**: in each kit's `dnd.tsx`, a named constant per threshold beside `DRAG_KEY_SEPARATOR`,
  and an explicit `sensors` prop on `<DragDropProvider>`. The mouse-on-handle path gets a real
  distance threshold, which it does not have today; keep the touch delay at the library's current
  value unless there is a reason to move it, and say in the docblock that the number was adopted
  from the library rather than invented, so a later reader knows what it is anchored to.
- **GOTCHA**: configuring sensors explicitly means **opting out of the preset**, so the keyboard
  sensor has to be listed too or it silently disappears — and it is the thing this phase is named
  after. Assert its presence in a test rather than trusting the diff.
- **MIRROR**: BOTH_KITS_BYTE_IDENTICAL, CONSTANTS_LIVE_WHERE_THE_LIBRARY_IS_NAMED.
- **VALIDATE**: both kits' `dnd.test.tsx`; `pnpm size` for `dist/dnd.js` against the 1.25 kB budget,
  with the measured figure reported rather than the budget moved.

### Task 3: The stand-down has no test; give it one

- **IMPLEMENT**: a case in `keyboard-navigation.test.tsx` that renders a grid with
  `data-row-dragging` present and asserts the navigation handler yields — no caret move, no
  `preventDefault`. Add the `Alt+Arrow` variant, which is Task 1's regression guard.
- **GOTCHA**: this is the first test in that file to care about dragging; it needs no drag adapter,
  because the gate reads a DOM attribute, not the drag state. Keep it that way — a test that mounts
  an adapter to check a `querySelector` is testing the wrong layer.

### Task 4: The success criterion, as one spec

- **IMPLEMENT**: one spec, both kits, that in a single grid sorts with the keyboard, selects a row,
  navigates with arrows, and performs a complete keyboard drag — asserting after each that exactly
  one thing happened. The `Alt+Arrow`-during-drag case is the one that fails before Task 1.
- **GOTCHA**: `Alt+Arrow` row ordering **does not reach heroui** — React Aria's `Row` forwards no
  `onKeyDown` (#223), and that is a documented kit difference, not a regression. The spec must
  express that as a kit difference rather than failing on one kit, and must not "fix" it.
- **GOTCHA**: a keyboard drag is `Space`/`Enter` on the handle, arrows to move, `Space`/`Enter` to
  drop, `Escape` to cancel — the library's keys, which the repo has never driven before. Verify them
  against `index.js:1342-1356` rather than assuming, and check `Enter` on a cell focuses the handle
  (`firstFocusableIn`), which makes a second `Enter` start a drag.

## Open Question This Plan Does Not Close

**`Tab` ends a keyboard drag** (`end: ['Space','Enter','Tab']`), while the grid's one-tab-stop model
rewrites `tabIndex` on every render and knows nothing about drags. What a `Tab` mid-drag actually
does — commit at the current position, or commit and move focus somewhere the tab-stop model did not
expect — is unmeasured. Task 4 should drive it and **record what happens**; whether to change it is a
separate decision, because `Tab` committing a drag is the library's documented behaviour and
overriding it is a keyboard-contract change, not a bug fix.

## NOT Building

- **A wider stand-down gate.** `root.querySelector` cannot see the column panel, which is portalled
  to `body` in both kits — but the grid's `onKeyDown` is on the kit's `Table` element, and a keystroke
  in a portalled popover bubbles through the React tree to the toolbar, never to `<Table>`. The gate
  is **inert** there, not wrong. Widening it to `document` would make a panel drag disable navigation
  in a table the user is not dragging in.
- **Moving `Escape` handling into the grid.** It is dnd-kit's `cancel` key, and
  `use-keyboard-navigation.ts:30-33` deliberately writes no cancel. Three layers see `Escape` and the
  navigation module yields to both others by design.
- **A touch-specific spec.** Playwright's touch emulation would be driving the library's own delay
  constraint, not our code.

# Report: DnD Phase 7 — Keyboard + touch sensors

## The phase's own premise was false, and finding that out was most of the work

The PRD scoped this phase as "add keyboard and touch sensors". **Both were already live**, and had
been since phase 4: `@dnd-kit/dom@0.1.21`'s `defaultPreset` is `sensors: [PointerSensor,
KeyboardSensor]` (`index.js:1822`), neither kit passed a `sensors` prop, and the keyboard sensor's
`shouldActivate` already compares the event target to `source.handle` (`:1356`) — which is the
handle-only activator discipline the PRD asks for, enforced by the library rather than by us. Touch
already carried a 250 ms press-and-hold.

So a survey replaced the phase's scope before a line was written. What remained was narrower and
sharper than what was planned.

## What actually shipped

1. **A fixed defect: `Alt+Arrow` moved a held item twice per press.** While an item was being
   dragged, the keystroke reached both the grid's reorder shortcut and dnd-kit's arrow key, and both
   acted. Both handlers now stand down while their own item is being dragged.
2. **A mouse drag from the handle needed no movement at all.** Upstream's constraint function
   returns `undefined` for a mouse on the handle, so a drag began on `pointerdown` — a plain click
   could start one. It now takes the distance upstream already applies to every pointer it does
   constrain.
3. **The sensors and every threshold are named and passed explicitly**, rather than inherited from a
   default that can move in a minor release.

## Two wrong diagnoses of mine, both corrected by measurement before any code was written

Recorded because each would have shipped a non-fix, and in both cases the implementer brought
evidence rather than complying.

- **"Reorder the two guards in `use-keyboard-navigation.ts`."** I read the `event.altKey` return
  sitting above the drag check and called it the defect. It is not: **both guards return**, so no
  input distinguishes the orders. The collision lives one level down — `row.tsx` and
  `header-cell.tsx` bind `onKeyDown` on the `<tr>` / `<th>`, _below_ the `<Table>` element that
  handler sits on, so the reorder has already happened by the time the event bubbles up. The fix
  belongs in those two handlers, which is where it went.
  I then compounded the error by keeping the reorder anyway "for docblock honesty". A review priced
  it: a `querySelector` on every `Alt+Arrow` press, in the reorder hot path, for no behavioural
  difference, under 25 lines of comment asserting load-bearing-ness. Reverted.
- **"The header can read `useColumnDrag()`."** It cannot: `ColumnDragShell` mounts the provider
  _inside_ the `<th>` whose `onKeyDown` is being gated, one level below the handler. The header asks
  the DOM instead — `closest(COLUMN_DRAGGING_SELECTOR)` — which is narrow by construction, unlike the
  navigation module's root-wide query.

A third correction went the other way. I told the implementer to retarget the two negative controls
because they assert that a _different_ row reorders while one is being dragged, which looked like a
test blessing a hazard. The review showed that is **exactly what makes them work**: any root-wide
gate fails them. Retargeting would have traded the only guarantee pinning the gate narrow for
tidiness about a contrived, pre-existing case. Cancelled; the residual is a comment instead.

## The HIGH a review found, and why it was invisible

The new constraint function keyed on `pointerType` alone, where upstream's condition is
`pointerType === 'mouse' && (source.handle === target || source.handle?.contains(target))`
(`index.js:1532`). The signature was the giveaway — it took `Pick<PointerEvent, 'pointerType'>`,
having discarded the `target` and `source` the condition needs, so the check was not merely missing
but unexpressible.

Consequence: every **handle-less** mouse gesture was rerouted to a 5 px distance, where upstream sent
it to the text-input branch's `tolerance: 0`. A handle-less sortable is reachable through documented
composition rather than misuse — `header-cell.tsx` offers `dragHandle` as a _render argument_ while
`ColumnDragShell` registers the sortable on the `<th>` regardless, so a header that does not render
the handle is still draggable. Failure: drag-selecting text in such a header's filter input starts a
column drag at 6 px.

**What made it invisible was a docblock asserting the opposite** — "unreachable here … this adapter
always lands a handle". The adapter does not decide whether the handle is rendered; composition does.
All four upstream branches are now reproduced with exactly one deliberate deviation, and that
paragraph is replaced by why the text-field branch is load-bearing.

One detail worth keeping from the fix: the node type is compared as the number `1` rather than with
`instanceof Node`, because `Node` is realm-bound and the docs render examples inside iframes.

## Measured and recorded rather than decided

- **`Tab` mid-drag commits** the drag at the position the arrows reached. On shadcn focus stays on
  the handle; on HeroUI it leaves the table, which is React Aria's focus manager. `Tab` is dnd-kit's
  documented `end` key, so this is **left as the library's behaviour** and documented; overriding it
  would be a keyboard-contract change, not a bug fix.
- **Two `Enter`s on a cell start a drag**: the first moves focus into the cell and onto the handle,
  the second is the library's `start` key. shadcn only — HeroUI runs React Aria's focus model.

## Also left standing

- Both stand-down guards also fire during a **pointer** drag, where no keyboard sensor replaces the
  suppressed chord. Kept deliberately — reordering an item out from under a live drag is worse than
  dropping a keystroke — and the docblocks now say that rather than the keyboard-only reason.
- A _second_ item can still be reordered during a pointer drag, mutating the index space the sorting
  plugin is operating over. Pre-existing, contrived, and now recorded in a comment rather than
  silently pinned by a test.

## Three harness facts, each of which first produced a false failure

From the browser spec, and worth more than the spec itself:

- `locator.focus()` **once** is not enough on HeroUI — React Aria's row absorbs the first call, so
  the key goes to the `<tr>` and does nothing. This nearly shipped as "no keyboard drag on HeroUI",
  which is false.
- A movement key during a drag must wait for the displacement to land (phase 9's microtask deferral)
  or the drop key commits the un-moved position.
- The caret must be read from the tab stop, not `activeElement`: mid-drag the displacement remounts
  the row and focus falls to `<body>`.

## Budget

`dist/dnd.js` was raised twice this phase, each time with the measured figure: 1.25 → 1.45 → 1.6 kB,
against a measured 1389 B (15.2% headroom, the repo's convention). The entry was 744 B before phase 9. The growth is the adapter taking ownership of what used to be upstream's defaults and upstream's
bugs — phase 9's tracked hover id and neighbour anchor, and this phase's explicit sensor set with all
four activation branches. It loads only when a consumer writes `createDataGrid({ dnd })`.

## Gate results

Measured on the finished tree rather than taken from a sub-task's report.

- `pnpm run ci` (lint → typecheck → test → build → size): **30/30 tasks, exit 0**.
  `@ez-kit/data-grid-react` 985, shadcn 116, heroui 132, core 797, docs 210.
- `@ez-kit/data-grid-react` under React 18: **985/985**.
- Full browser suite, both kits plus the docs project: **981 passed, 5 skipped, 1 failed** — and the
  one failure was test **1 of 987**, a `page.goto` timeout on the first navigation after `.next` and
  `.source` were deleted, i.e. the cold Turbopack compile exceeding the 30 s test timeout. Re-run
  warm, that spec file is 5/5. Not a regression; recorded rather than hidden, because deleting the
  cache before the suite is now the standing rule and this is its cost.
- Three of the five skips are the new spec's HeroUI cases, each a documented kit difference
  (`Alt+Arrow` row ordering, #223; and React Aria owning focus, which the grid's caret model and the
  "Enter focuses into the cell" behaviour depend on).

The risk a review could not retire by reading was also retired here: `keyboardNavigation: true` on
the docs' shadcn dnd wrapper now also applies to the four pre-existing drag examples, giving them a
roving `tabindex` and a table-level key handler they did not have. All four specs pass.

## A guard this phase tripped, and why that is the point

`docs-option-names.test.ts` failed on the new key table under `### Keyboard` — "in neither
optionTables nor nonOptionTables". That test's coverage over the documented pages is **total by
design**, because the two worst pages in the docs' history were unmapped ones: one documented a
`sizing` option that never existed, the other a whole `meta.editType` API that never existed. So an
unclassified table is a failure, not a warning, and the table is now a `nonOptionTables` entry —
its first column is a key on the keyboard, not a key of a type.

Worth recording that this was a briefing omission rather than an implementation error: the guard is
documented in `AGENTS.md` and was simply not named when the documentation work was handed over,
while three sibling guards were.

# Implementation Report: DnD Phase 6 — Visibility-panel drag

**Status: COMPLETE.** The open decision the phase carried — how the panel and the header keep
separate index spaces — is taken, implemented and tested. The browser suite is green in both kits on
two consecutive runs, and the react package is green on React 19 and React 18.

## The open decision, and why it went the way it did

The phase-5 report set the problem out: the visibility panel is the same `axis: 'column'` as the
header — same slice, same drop helpers — but a **different index space**. The header registers the
_visible_ leaves under `ColumnMoveScope.Visible`; the panel lists every leaf including the hidden
ones under `ColumnMoveScope.All`. `@dnd-kit/dom@0.1.21`'s `OptimisticSortingPlugin` sorts each
group's sortables by index and asserts the i-th has `index === i` — read again in
`sortable.js:378-385` for this phase, not taken on trust — so two lists of different lengths in one
group fail that check the moment both surfaces are mounted, and **both** stop working, silently.

Two options were named: a group value of the panel's own, or a rule that the two are never draggable
at once. **The first was taken**, for one reason that decides it: both surfaces are mounted in the
same grid as soon as a toolbar carries the Columns toggle, which is the ordinary arrangement, so the
second option is not a constraint anyone could keep. It would also have had to be enforced somewhere
— and the only place is the same code that would otherwise just partition the space.

What that costs is a field on the port, `DragSpec.surface`, reported back on both events. The
alternative shapes were considered and rejected:

- **A third `DragAxis` member.** The axis names the slice a drop writes, and the panel writes
  `columnOrder` exactly as the header does. A `'panel'` axis would have made every `switch` over the
  axis carry two arms doing the same commit with one argument different, and `dnd/types.ts` already
  told the next reader not to add one.
- **Deriving the surface from the id.** There is nothing in a column id that says which surface a
  drag started on, and the same column is registered on both at once.
- **Keeping the axis as the group and giving the panel `ColumnMoveScope.Visible`.** That is the same
  space only while nothing is hidden, which is the one case the panel exists for.

## What the surface field is, and what it is not

`DragSpec.surface` is **required**, not defaulted to `'table'`. A default would let a future surface
join an existing one's index space by omission, which is the silent-death case the field exists to
prevent; a caller who has to name it is a caller who had to think about it.

Both adapters now register `type` / `accept` / `group` as one joined `<axis>:<surface>` key and read
it back with `fromDragKey`, which refuses anything it did not write. **This is not the composite
`group` key the PRD removed in r3**, and the difference is structural rather than a matter of taste:
that one encoded a column's pin band and its `parentId` — facts about data, arriving from ids that
may contain any character, hence its injective-encoding machinery — in order to enforce boundaries
mid-drag. Boundaries are still enforced by `canDrop` plus the core drop helpers. This joins two
closed sets of literals, neither containing `:` and neither supplied by a caller, so it is injective
by construction.

## Tasks

| #   | Task                                         | Status    | Notes                                                                      |
| --- | -------------------------------------------- | --------- | -------------------------------------------------------------------------- |
| 1   | `DragSurface` on the port, both events       | ✅        | Required field; `dnd/types.ts` carries the reasoning                       |
| 2   | `<axis>:<surface>` key in both adapters      | ✅        | `toDragKey` / `fromDragKey`, plus 4 new refusal cases per kit              |
| 3   | `getVisibilityPanelColumns`                  | ✅        | One list, three readers — the trigger, the item, the provider              |
| 4   | `VisibilityItem` + `DataGrid.VisibilityItem` | ✅        | The row element a kit's panel renders; publishes `ColumnDragContext`       |
| 5   | Surface-aware commit and `canDrop`           | ✅        | `COLUMN_DROP_SCOPE` + `columnDropOrder` in `GridDndProvider`               |
| 6   | Both kits' `VisibilityMenu`                  | ✅        | Swap their wrapper `div` for the shared item; grip first in the row        |
| 7   | Unit tests                                   | ✅        | 15 cases, `visibility-item.test.tsx`; react package 937 → 939 with phase 9 |
| 8   | Docs example + manifest + registry           | ✅        | `column-panel-drag`, one hidden column and one locked                      |
| 9   | Browser spec                                 | ✅        | 5 cases × 2 kits, green twice                                              |
| 10  | Budgets                                      | ✅ raised | Three limits, measured figures below                                       |
| 11  | Changeset                                    | ✅        | react / heroui — never shadcn                                              |

## Validation

| Check                                 | Result                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                      | ✅ clean                                                                                             |
| `pnpm lint`                           | ✅ clean (0 warnings)                                                                                |
| `pnpm --filter …data-grid-react test` | ✅ 937 (939 after phase 9's first task)                                                              |
| `pnpm test`, whole repo               | ✅ every package — heroui 95, shadcn 79, core 797, docs 208, react 937; **red first**, see finding 5 |
| `test:react18`                        | ✅ 937 — no new ref hazard; the panel item is a plain `div`                                          |
| `pnpm --filter @ez-kit/docs test`     | ✅ 208 — page map, e2e slots and tree shaking unchanged                                              |
| `pnpm build`                          | ✅                                                                                                   |
| `pnpm size`                           | ✅ after three explicit raises; measured figures below                                               |
| Registry payload                      | ✅ `@dnd-kit` count 0                                                                                |
| Browser, `column panel drag`          | ✅ 10/10 (5 × 2 kits), first run and again in the whole group                                        |
| Browser, whole `ordering/` group      | ✅ 58/58 both kits, twice — row drag and header drag unaffected                                      |
| Browser, **whole suite**              | ✅ **621 / 0 / 2** (`pnpm test:e2e`, CI's shape) and **951 / 0 / 2** including the `@smoke` specs    |

### Sizes, measured

| Entry                                    | Before   | After        | Limit              |
| ---------------------------------------- | -------- | ------------ | ------------------ |
| `@ez-kit/data-grid-react` root           | 29.67 kB | **29.97 kB** | 30 → **31 kB**     |
| `@ez-kit/data-grid-heroui` `dist/dnd.js` | 578 B    | **676 B**    | 660 → **740 B**    |
| `@ez-kit/data-grid-shadcn` `dist/dnd.js` | 578 B    | **676 B**    | 660 → **740 B**    |
| `@ez-kit/data-grid-heroui` `visibility`  | ~1.02 kB | **1.06 kB**  | 1.05 → **1.15 kB** |
| `@ez-kit/data-grid-shadcn` `visibility`  | ~2.2 kB  | **2.36 kB**  | 2.3 → **2.5 kB**   |
| `@ez-kit/data-grid-heroui` root          | 14.94 kB | 14.98 kB     | 16.6 kB, unchanged |
| `@ez-kit/data-grid-shadcn` root          | 17.06 kB | 17.04 kB     | 19 kB, unchanged   |

**The whole browser suite came out with no failures at all**, on two consecutive runs — including
`filtering/chips.spec.ts:127`, which the phase-5 report recorded as failing 2/2 on a baseline tree in
both kits, and the third, different, flaky failure it saw on each run. Nothing in this phase touches
filtering. Recorded as an observation rather than a fix: the honest reading is that those were flakes
at a rate two runs could not distinguish from a standing failure, and AGENTS.md's reference figure of
610 / 3 / 2 should be read with that in mind.

The `dnd.js` overrun is `toDragKey` / `fromDragKey` plus `toSortableId` / `fromSortableId`, and nothing else; the two `visibility` entries
carry the kit's grip import. **The react root's limit was raised although it was not exceeded**, and
that is worth stating plainly: at 29.97 kB against 30 kB it had 30 bytes of headroom, which is not a
budget — it is a check that fails on the next word written into that entry, whatever it is. The new
number is 31 kB against a measured 29.97 kB. Every other raise here answers a real overrun and is
named with the figure that caused it.

`@dnd-kit` reachability from a kit root is still 0, which is the PRD's actual metric — a kit's own
grip is not the drag library.

## Findings

**1. The two surfaces need separate _collision_ spaces too, not only separate index spaces.** The
phase-5 note framed this as a `group` question. It is also a `type` / `accept` question: a panel
opens in a popover that overlays the header, so without the split a panel row and a header cell of
the same axis would be candidate collision targets for each other. One joined key covers both jobs,
which is why all three options take the same string rather than `group` alone being widened.

**2. A panel drag inside a popover works in both kits with no special handling — checked rather than
assumed.** Both panels portal their content out of the grid's DOM subtree, so the drag provider's
element is not an ancestor of the dragged row. React context still reaches it, which is what
`useSortableItem` needs, and `@dnd-kit/dom` works off the elements it is handed rather than off a
container. Ten browser cases pass in both kits; this was the one part of the design that could have
failed for a reason no unit test would show.

**3. The kit boundary had to move, and the PRD's wording anticipated only half of it.** "The logic
lives in `visibility-trigger.tsx`, not the kits" holds — the index space, the participation rule and
the scope are all in the shared package — but the _element the drag moves_ is one only a kit puts in
the DOM, because `VisibilityMenu` is a DI component that renders the rows itself. So a shared
component the kit mounts (`VisibilityItem`) is the seam, and both kits' panels changed by swapping
their wrapper `div` for it. The `column-visibility-item` slot moved to the shared package with it,
which is what keeps the existing browser specs addressing the same thing.

**4. `ColumnDragHandle` serves both surfaces unchanged, and that is worth stating rather than
noticing.** It reads `ColumnDragContext`, which the panel's item shell now publishes alongside the
header cell's shell. The handle asks "is the column I am in draggable, and where is its activator" —
a question neither surface answers differently — so the axis has one handle component, and a kit's
grip block needed no second copy.

**5. THE defect of this phase: the panel and the header registered the same drag-library id, and
opening the panel killed the header's drag outright.** Found by the browser case the review pass asked
for, not by anything else — and nothing else could have found it.

dnd-kit's registry is keyed by **id across the whole manager** — not per `type`, not per `group` — and
a second registration under an existing id replaces the first. The panel lists the same columns the
header does, so both surfaces registered a sortable called `name`. Opening the panel replaced the
header's `name` draggable with the panel's, whose element lives inside a popover; closing the panel
unregistered that entry outright. From the **first time the panel was ever opened**, the header's
handle stopped starting a drag at all — measured with `elementFromPoint` and `data-column-dragging`:
nothing overlaid the handle, its box was unchanged, `pointer-events` was `auto` on every ancestor, and
`data-column-dragging` was never stamped. No pickup, no error, permanent. Two more probes ruled out the
plausible-sounding causes: closing the popover with the trigger instead of `Escape` behaved the same,
and pressing `Escape` in a grid that never opened the panel changed nothing.

The fix is `toSortableId` in both adapters: the **registered** id is `<axis>:<surface>:<id>` and the
port's id stays the grid's own, recovered by `fromSortableId`. Injective without escaping, which is the
part that matters: the two prefix segments come from closed sets of literals containing no `:`, so the
id is recovered by skipping exactly two separators and an id full of colons survives byte-identical —
there is a unit case for that in both kits. Note the same hazard existed **across axes** before the
panel did: a grid whose `getRowId` returned a string that is also a column id would have collided, so
this closes a latent defect as well as the reachable one.

Two consequences worth keeping. First, `type` / `accept` / `group` were necessary and not sufficient:
they partition collisions and the index space, and say nothing about identity. Second, **a browser case
was the only instrument that could see this.** Every unit suite passed throughout, both kits' suites
passed, `typecheck` and `lint` passed, and the panel's own five browser cases passed — because none of
them has a header handle in the same grid.

**6. Two things are left open, both found while writing that case, and neither is fixed.**

- **In the HeroUI kit a header column cannot be dragged while the column panel is open.** The
  popover's own overlay covers the header, so the pointer never reaches the handle; the shadcn kit's
  popover does not do this and the same gesture works there. Measured after the id fix, so it is a
  separate thing. It is a kit-popover property rather than anything the drag layer can reach, the
  gesture is an odd one to want, and the panel is the affordance for reordering while it is open — so
  it is recorded rather than worked around.
- **A second _scripted_ drag on this example does not commit, in either kit, whichever surface it is
  on and whichever came first** — while a second scripted drag on `column-drag.spec.ts`' example does,
  with the same per-neighbour leg rule. Waiting out the drag library's leftover clone did not change
  it. The difference is therefore this example's geometry rather than the surfaces, which makes a
  harness artefact the likely explanation and a product defect the unlikely one — but that is an
  inference, not a measurement, and it is why the spec drives one drag per case. Whoever writes the
  first two-drag case on a single-header-row example should expect to finish this.

**7. Putting a shared component inside a kit's DI component broke the kit's own unit tests, and only
the full `pnpm test` found it.** Both kits render `VisibilityMenu` **standalone** in their suites —
it takes a `columns` array, so a grid is not needed to exercise it — and the new row component
reached for two contexts that only a grid provides. Five cases across the two kits went red while
`typecheck`, `lint`, the react package's own 937 and the 58 browser cases were all green, because
none of those renders a kit block on its own. Two fixes, and neither is a workaround:

- `useOptionalDataGridTable()` — a non-throwing read beside `useDataGridTable()`, used by
  `VisibilityItem` alone. The throw is right for a component that reads the table to _do_ something;
  this one's grid-less rendering is a supported arrangement in which it has no drag to register and
  correctly falls back to the markup it replaced.
- `ColumnDragHandle` destructures `components.core` **after** its `if (!drag) return null` rather
  than beside the hook reads above it. Outside a grid `.core` is undefined, so the destructure threw
  before the `null` the component's own contract already promised. The hooks still all run; only a
  property access moved.

The lesson is about the seam rather than the two lines: **a component the shared package hands a kit
to mount is rendered in whatever the kit renders it in**, including a test harness with no grid, and
has to be correct there. Worth remembering for phase 7, which will hand the kits more.

**8. A test filtered on the surface alone and read the rows as columns.** `latestOn('table')`
returned six entries where three were expected: a grid with a body registers every **row** on the
table surface too, disabled while row ordering is off. Caught by the first run of the new suite. Not
a product defect — and a fair reminder of what the two fields mean: the axis partitions the slice, the
surface only the list.

## Deviations from the plan

- **`DragSpec.surface` is required rather than optional.** The port's other optional member,
  `disabled`, is optional because omitting it means something (`false`). Omitting a surface would
  mean "put me in some other surface's space", which is never what anyone wants.
- **The shadcn kit's `VisibilityMenu` changed, and that reaches the registry payload.** It is
  `blocks/`, not `components/ui/**`, so the immutability rule does not apply — but a consumer running
  `npx shadcn add` gets the new panel, which is why the changeset says so. `@ez-kit/data-grid-shadcn`
  is not named in it; the change ships through `@ez-kit/data-grid-react`, as the rule requires.
- **No RTL case for the panel.** The panel list runs top to bottom in both writing directions — the
  reason both kits already draw its move pair as up/down arrows rather than start/end — so there is
  no inline axis to verify. The header's RTL case remains the one that matters.

## Notes for the phases after this one

- **Phase 7 (sensors)** now has three surfaces to keep the activator discipline on, not two. The
  panel's handle is inside a popover, which already traps focus and already handles `Escape` — so the
  keyboard sensor's `Escape` and the popover's will both want it. That conflict does not exist in the
  header or the body and is the first thing to check.
- **Phase 9 (virtualization)** is unaffected by anything here: the panel is never virtualized.
- **Phase 11** must add the panel example's page. `verify-manifest-coverage.mjs` does not run in CI
  (checked again), so nothing fails until someone runs it by hand.

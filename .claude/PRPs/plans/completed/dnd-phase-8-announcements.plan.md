# Plan: DnD Phase 8 — Announcements + ARIA

## Summary

The phase's success criterion — **"no English string literal in the drag path"** — is already met for
every string this repo authors, and violated by one it never asked for.

Both drag handles read `messages.ordering.dragRow` / `.dragColumn`; the kits' shells carry only
`aria-hidden` on an icon; neither kit's `dnd.tsx` contains an `aria-*`, a `title` or a text node. The
violation is imported: `@dnd-kit/dom@0.1.21`'s `Accessibility` plugin is in `defaultPreset.plugins`
and neither kit passes `plugins`, so **it is injecting English into both kits' DOM today** — a
`role="status" aria-live="polite"` region on `document.body`, a hidden instructions node wired onto
each handle as `aria-describedby`, `aria-roledescription="draggable"`, and a sentence beginning
"To pick up a draggable item, press the space bar."

So this phase is not about writing strings. It is about taking ownership of announcements that are
already being made, badly, in a language the consumer did not choose.

They are also **bad on their own terms**, which is the part worth fixing beyond translation. The
plugin's callbacks receive only `source.id` and `target.id`, so its best sentence is _"Picked up
draggable item 7."_ — where `7` is a record id. A user reordering a column hears the column's
internal id, not its header; a user moving a row hears a database key, not a position.

## User Story

As a screen-reader user, I want to hear which column I picked up and where it landed, in the
application's language, so that a drag is something I can follow rather than a silence punctuated by
record ids.

## Problem → Solution

| Problem                                                  | Solution                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| English injected by a plugin nobody configured           | `Accessibility.configure({…})` with text from the `messages` catalogue |
| Announcements name record ids, not columns and positions | The grid builds the sentences; it is the only layer that knows         |
| The adapter must not learn about tables                  | The port carries the announcements, in its own vocabulary              |
| Passing `plugins` silently drops four other plugins      | Relist them, and pin that with a test                                  |
| HeroUI may not forward `aria-roledescription`            | Prove it in a browser before relying on it                             |

## The one real decision: who builds the sentences

The library hands its callbacks an id and nothing else, so turning `"7"` into _"Price, column 3 of
9"_ needs the table and the message catalogue — neither of which a kit's adapter has, or should.

**Decision: the port carries the announcements.** `DndProviderProps` grows an announcement bag whose
callbacks take the port's **existing** event vocabulary (`DndDragOverEvent`, `DndDropEvent` — axis,
surface, ids) and return strings. `GridDndProvider` builds it from the table and `useGridMessages()`;
each kit forwards it into `Accessibility.configure({ announcements })`.

The alternative — a kit's `dnd.tsx` reaching for `useDataGridTable()` and `useGridMessages()` — was
rejected: it puts domain knowledge in the layer that exists to not have any, and it makes every
future adapter reimplement announcements to get parity. This is a **port extension**, which phase 9's
plan listed under "NOT building"; that was that plan's scope, not a standing rule, and this is the
case the port is for — what happened to the data is the grid's knowledge.

## Mandatory Reading

- `node_modules/@dnd-kit/dom/index.js:94-123` (the defaults being replaced), `:157-171` (the
  constructor proving they are destructuring fallbacks, not frozen), `:211-226` (the nodes, created
  per manager), `:240-275` (the ARIA it reflects live).
- `packages/data-grid/core/src/messages/types.ts:226-243` — the `ordering` group, whose docblock
  **already reserves it** for "the live-region announcements and the handle's ARIA description".
  Phase 8's keys belong there; do not invent a group.
- `packages/data-grid/react/react/src/data-grid/row-count-status.tsx:12-14` — why the grid has
  exactly one live region and why it narrates only the row count.
- `packages/data-grid/react/react/src/messages.test.tsx` — the five overriding cases this must not
  break.

## Patterns to Mirror

### CLOSED_SET_AND_RESOLVED_PER_GROUP

`resolveMessages` folds **per group**, so a consumer replaces one key without losing its siblings.
New keys go in `ordering`, with English defaults, and inherit that for free.

### BOTH_KITS_BYTE_IDENTICAL

`dnd.tsx` in the two kits is byte-identical below its header docblock, verified by `shasum`.

## Step-by-Step Tasks

### Task 1: The message keys

- **IMPLEMENT**: keys under `ordering` for the instructions text and for each announced event, as
  functions where the sentence needs a value (the moved thing's name, its old and new position, the
  total). Follow the catalogue's existing function style (`grid.rowCount({count})`).
- **GOTCHA**: a sentence assembled from fragments cannot be translated — word order differs between
  languages. Each key is one whole sentence taking named values, never a stem plus a suffix.

### Task 2: The port carries announcements

- **IMPLEMENT**: the bag on `DndProviderProps`, typed in the port's vocabulary, **optional** so an
  existing custom adapter keeps compiling. Document that an adapter which ignores it is still
  correct, merely silent.
- **VALIDATE**: `dnd/types.ts`'s docblocks stay true; the noop adapter still satisfies the type.

### Task 3: `GridDndProvider` builds the sentences

- **IMPLEMENT**: it has the table and the messages. Resolve a column id to its header text and a row
  id to its position among the rows the body renders — `getRowDropIndex` and the published list from
  phase 9 are already the right source, and using them keeps the announcement agreeing with what the
  drag actually did.
- **GOTCHA**: a header can be a React node rather than a string. Fall back to the column id rather
  than rendering a node to text, and say so.

### Task 4: Both kits configure the plugin

- **IMPLEMENT**: `plugins={[Accessibility.configure({ announcements, screenReaderInstructions }),
AutoScroller, Cursor, Feedback, PreventSelection]}`.
- **GOTCHA**: **passing `plugins` opts out of the preset.** Omit one of the other four and
  auto-scrolling, the cursor, the drag feedback or text-selection suppression disappears silently —
  the same trap `sensors` already carries a docblock about. Relist them and **assert the array in a
  test**, as the keyboard sensor is asserted.
- **GOTCHA**: do not pass an explicit `id`. The nodes are created per manager, so three grids on a
  page have three regions and each announces only its own; a fixed id would collide them.

### Task 5: Handle ARIA, and proving it in HeroUI

- **IMPLEMENT**: `aria-roledescription` on both handles from the catalogue, replacing the plugin's
  English `"draggable"`.
- **GOTCHA**: shadcn's `Button` spreads props last, so ARIA reaches the DOM. **HeroUI's is
  unverified** — it forwards to a React Aria button, and AGENTS.md records RAC losing `data-selected`
  on rows by spreading its own bag after the caller's. Prove it in the browser spec before relying on
  it; if it is dropped, say so and leave the plugin's value there rather than shipping an attribute
  that silently does not apply.

### Task 6: The spec

- **IMPLEMENT**: a spec asserting the live region's **content** after pickup, move, drop and cancel,
  in both kits, plus the handle's ARIA. Extend `a11y/`, where the kit-difference specs already live.
- **GOTCHA**: the region is on `document.body`, outside the grid, and there is one per grid — scope
  the locator accordingly rather than to the grid fixture.

## Honest Limit

The PRD's criterion says "a manual check of a full keyboard drag". **A real screen reader will not be
run.** What this phase can prove is that the right text reaches a correctly-shaped live region at the
right moment, and that is what the spec will assert. Whether it _reads well_ through NVDA or VoiceOver
is unverified, and the report will say so rather than implying a check that did not happen.

## NOT Building

- **Replacing the `Accessibility` plugin.** It is configurable, and dropping it would cost the live
  region, the instructions node, the auto `tabindex`/`role` on non-button handles and the live
  `aria-pressed` / `aria-grabbed` / `aria-disabled` reflection — all of which we would reimplement.
- **A second live region.** `RowCountStatus` narrates the row count and is deliberately the only
  thing the grid announces; the library's region is a sibling on `document.body`, not a rival.
- **Announcing a pointer drag.** The live region exists for a gesture a sighted pointer user can
  already see; announcing every `dragover` of a mouse is noise.

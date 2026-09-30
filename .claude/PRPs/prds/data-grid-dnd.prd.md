# Data-grid drag and drop

> Revision 3. r1 was fact-checked and critiqued against the codebase; r2 corrected three false
> claims. r3 removes four pieces of machinery r2 had invented, after reading TanStack's own
> `row-dnd` example. Anything marked **[removed in r3]** was in an earlier revision and must not
> come back without new evidence.

## Problem Statement

The data-grid already reorders rows and columns — `rowOrderingFeature` / `columnOrderingFeature`,
the `rowOrder` / `columnOrder` slices, and three affordances over them: column-menu entries,
`Alt+Arrow`, and the column panel the `ordering.column.visibilityMenu` flag turns the Columns
toggle into. Every one of them moves **one step at a time**. Nobody arranges a ten-column table by
clicking "Move left" thirty times, so in practice the feature is reachable and unused.

## Evidence

- The ordering core is written, tested and shipped (`packages/data-grid/core/src/features/ordering/`),
  so the gap is an affordance, not a capability. An observation about the repo, not a user report.
- The panel affordance is not even kit code: the logic is in the shared
  `react/react/src/data-grid/visibility-trigger.tsx:59`, which widens the list and attaches
  `canMoveStart` / `canMoveEnd` / `onMoveStart` / `onMoveEnd` built with `ColumnMoveScope.All`.
  Both kits ship only a presentational `blocks/visibility/VisibilityMenu.tsx`.
- **Assumption — needs validation**: that drag is the right affordance rather than, say, a "move to
  position N" input. No user research was run.

## Proposed Solution

Drag and drop as a **fourth affordance over the existing ordering state**, not a new TanStack
feature. Mechanics from `@dnd-kit/react` (the v2 line, `0.1.x`), reached through a port the shared
React package defines and does not depend on. The adapter ships from a kit subpath
(`@ez-kit/data-grid-<kit>/dnd`, export named `adapter`) with `@dnd-kit/react` as an **optional**
peer, following `@ez-kit/va-store/persist/url/react-router`.

DnD is reachable **only through composition**: `createDataGrid({ …, dnd: adapter })`. Neither kit's
prebuilt `DataGrid` binds it and there is no `<DataGrid dnd>` prop.

**The library does the work.** TanStack's own `examples/react/row-dnd` is the reference: the
sortable strategy displaces neighbours with transforms **during** the drag without touching state,
and state is reordered once, on drag end, with an index-based `arrayMove`. This grid does the same
through its existing commit paths. Everything r3 removed was machinery that duplicated what the
library already provides.

## Key Hypothesis

We believe a drag affordance over the existing ordering state will make reordering usable, without
costing a byte or a required install to grids that do not use it.

We will know we are right when a bundle of `{ DataGrid }` from a kit root contains no `@dnd-kit`
identifier — asserted with `bundledCodeOf()` — and the kit roots' size-limit numbers are unchanged.

## What We're NOT Building

- **A feature in `tableFeatures()`.** DnD writes the slices the existing features own.
- **A member of `FullGridComponents`.** `dnd` is a `createDataGrid` config field.
- **A handle placed by config.** No `rowActions.column` slot, no placement option.
- **An ephemeral preview order. [removed in r3]** r2 specified a grid-local preview array updated
  on `onDragOver`, discarded on `canceled`, with snapshot, rollback and virtualizer
  synchronisation. The sortable strategy already displaces neighbours with transforms and touches
  no state, so all of it duplicated the library. Nothing is lost visually. The corollary:
  `@dnd-kit/helpers`' `move` is for moving **between containers**, not for a single sortable list,
  and must not be cited as a reason for anything here.
- **A change to `applyRowMove`. [removed in r3]** r2 made it read `direction`, as a public-API
  behaviour change with its own changeset. Unnecessary: the drop index comes from the same
  collision model that produced the visual displacement, so an index splice is self-consistent
  with what the user saw — which is exactly why TanStack's example uses `arrayMove(data, oldIndex,
newIndex)` and never consults a direction. `direction` stays informational; `dropRow` derives it
  from the resolved positions, and its docblock says the ids are the source of truth.
- **A composite `group` key. [removed in r3]** r2 encoded pin band plus `parentId` into one
  identifier, with an injective encoding to survive ids containing the separator, frozen for the
  drag's duration. Boundaries are enforced where they already are: `spec.disabled` plus refusal in
  `dropRow` / `dropColumn`. Accepted cost: an illegal drop is refused on release rather than
  signalled mid-drag.
- **Keyed Provider and adapter-identity invariant. [removed in r3]** The per-root provider below is
  required anyway and fixes the value for a tree's lifetime; the docs app's lazy boundary swaps
  **kits**, which remounts. What remains is one docblock sentence and a cheap dev warning.
- **`data-drop-edge`. [removed in r3]** With displacement as the indicator there is no edge to
  name, and with it goes the closed set and most of the RTL surface.
- **Cross-page row moves, cross-band/cross-parent/onto-locked drops, column virtualization,
  multi-row drag.**
- **An exception in `AGENTS.md` for dnd-kit's inline styles.** The no-styles rule already decides
  it — _"the test is authorship, not the attribute"_. Cite that paragraph in the port's docblock.

## Success Metrics

| Metric                                       | Target                           | How Measured                                                                                                                |
| -------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `@dnd-kit` reachable from a kit root         | never                            | `bundledCodeOf()` in `apps/docs/test/tree-shaking.test.ts` asserts the identifier is absent from a bundle of `{ DataGrid }` |
| Bytes added to a kit root                    | 0                                | `pnpm size`, kit root entry, before/after                                                                                   |
| Peer install required for a non-DnD consumer | none                             | fresh install without `@dnd-kit/react` builds and runs                                                                      |
| `onChange` calls per drag                    | exactly 1                        | spec assertion                                                                                                              |
| Existing ordering behaviour                  | unchanged                        | `ordering.test.tsx`, `row-ordering-keyboard.test.tsx`, `tree-row-ordering.test.tsx` — untouched                             |
| Drag paths covered end to end                | rows, header, panel, virtualized | Playwright specs, both kits                                                                                                 |

**The entry-point-set metric from r1 does not work and must not be restored.**
`tree-shaking/bundle.ts`'s `workspaceOnly` plugin externalises every non-`@ez-kit/` specifier, so
`@dnd-kit/react` can never appear in a `pulls` set; `entryPointOf()` folds `dist/dnd.js` onto the
bare package name. `bundledCodeOf()` is the guard with teeth, and it earns its keep as a regression
check rather than as a day-one assertion.

## Open Questions

- [ ] How the docs app renders DnD examples, given `shared/DataGrid.tsx` lazy-loads the kits'
      **prebuilt** grids while DnD is composed-only.
- [ ] Which of the two candidate scrollports (`containerRef` / `scrollRef`, `table.tsx:194`) the
      auto-scroller is pointed at.
- [ ] Whether the dragged row is kept mounted by an added `rangeExtractor` or by the out-of-window
      mechanism pinned rows already use (`table.tsx:179` feeds `getCenterRows()`;
      `virtual-body.tsx` renders top/bottom rows outside the window). The second reuses a pattern
      that exists.
- [ ] Whether `@dnd-kit/react@0.1.x` takes a wide peer range or a tight one until 1.0.
- [ ] Export name `adapter` vs the sibling precedent `reactRouterAdapter`
      (`store-persist/src/url/react-router.ts:12`). Decided: `adapter` — a kit has exactly one and
      the path names it; recorded because it breaks symmetry deliberately.

---

## Users & Context

**Primary User**

- **Who**: an application developer assembling a grid for an internal tool where the arrangement is
  part of the data — an order queue, a priority list, a pricing table.
- **Current behavior**: enables `ordering`, gets menu entries and `Alt+Arrow`, ships that or writes
  a drag layer by hand.
- **Trigger**: the first time someone must move a column more than two places.
- **Success state**: one import and one config field; the boundary rules enforced for them.

**Job to Be Done**

When my users need to rearrange rows or columns, I want them to drag, so I can stop shipping a
one-step menu entry as a reordering feature.

**Non-Users**

- Consumers who want a grid and nothing else. They pay nothing, in bytes or in an install step.
- Consumers on the shadcn registry path who never add the DnD block.

**Constraints**

- No authored styling in `packages/data-grid/react/react`.
- `@ez-kit/data-grid-shadcn` is `private` and changesets-ignored (`scripts/check-changesets.mjs`).
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`;
  ESLint `--max-warnings=0`.
- Every user-visible string goes through the `messages` catalogue.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability                                              | Rationale                                                                                 |
| -------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Must     | `DndAdapter` port + no-op default + per-root provider   | The mechanism behind the optional peer, and the fix for adapter leakage into nested grids |
| Must     | `dropRow` / `dropColumn` in core                        | A drop needs the refusals a step gets, and is where boundaries are enforced               |
| Must     | `adapter` on `/dnd`, optional peer                      | The delivery shape                                                                        |
| Must     | Row drag, header drag                                   | The two surfaces users ask for                                                            |
| Must     | Drag announcements through `messages`                   | A drag with no live region is not shippable beside a keyboard sensor                      |
| Should   | Visibility-panel drag                                   | Has a home and a scope already                                                            |
| Should   | Keyboard + touch sensors                                | Interaction parity; `Alt+Arrow` already covers access                                     |
| Should   | Virtualized drag                                        | Grids big enough to need drag are often virtualized                                       |
| Could    | Invalid-drop affordance                                 | Boundaries are refused at commit; signalling earlier is a later improvement               |
| Won't    | Column virtualization, multi-row drag, cross-page moves | See above                                                                                 |

### MVP Scope

Phases 1–4: the drop helpers, the port, the heroui adapter on `/dnd`, and row drag with the pointer
sensor, the `isDragging` gate and `Escape`. That proves the delivery shape and the interaction on
one surface.

### User Flow

1. Developer installs `@dnd-kit/react`.
2. Writes one module: `createDataGrid({ components: allComponents, cellTypes, features, dnd: adapter })`.
3. Turns behaviour on unchanged: `ordering={{ row: true, column: { visibilityMenu: true } }}`.
4. Renders a handle — a component in a row, and/or `dragHandle` from `HeaderCell`'s render function.
5. User drags; neighbours part by transform; on release the grid commits once.

---

## Technical Approach

**Feasibility**: HIGH for delivery, MEDIUM for virtualization — the virtualizer lacks two things
the drag needs.

### The port

`DndAdapter = { Provider, useSortableItem(spec) }`,
`DragSpec = { id, index, axis, disabled }`. The default is a no-op returning inert refs and
`false`; a handle **must not render at all** when no adapter is registered.

**Hooks rather than components, decided.** A component-shaped port (render-prop `dnd.Row` /
`dnd.HeaderCell` / `dnd.PanelItem`) would put Rules of Hooks beyond reach by construction, and was
considered. It loses two things that matter more here:

- **Drag state would arrive below the data that needs it.** `Row` computes pinning offsets,
  `aria-rowindex`, classes and `rowProps()` at the top of its body; with a render prop `isDragging`
  exists only inside the callback, so anything consuming it must move in or the wrapper must move
  up. With a hook it sits beside the rest, and `rowProps({ row, isDragging })` stays a natural
  extension of a public callback.
- **The contract would grow by a member per surface.** One `useSortableItem(spec)` serves all three
  surfaces through `axis`; three components mean a fourth surface later is a new contract member —
  the lesson `FullGridComponents` already taught this repo, where every new key is a major.

The hazard the component shape would have removed is thin once the per-root provider exists (see
below), and the docs app's lazy boundary swaps **kits**, i.e. different components, i.e. a remount.
So what remains is one sentence in the port's docblock — _the adapter is bound once, at
`createDataGrid` time, and must not change under a mounted tree_ — plus a cheap development-mode
warning if the identity changes. **No keyed Provider, no invariant. [removed in r3]**

**Every grid root provides its own value.** The contexts in this package are module-level (all 12
`createContext` calls in `react/react/src` are at module scope), so one context object is shared by
everything resolving the same copy of `@ez-kit/data-grid-react`. A DnD-bound grid containing a
non-DnD grid — expanded detail rows, nested grids — would otherwise hand the inner grid the outer
adapter. A root provides a bound adapter **or an explicit no-op**, never falls through to the
ambient default. This is also what makes the "bound once" rule true in practice.

### Registration

`dnd` is a field of `CreateDataGridOptions` (`create-data-grid.tsx:24`), beside `keyboardNavigation`
(`:84`). `createDataGrid` is called exactly once per kit, at `src/data-grid.tsx:116` in both, and
neither call passes it. This keeps the kit root's module graph clear of `@dnd-kit/*` and leaves the
"a kit root is everything by construction" rule without an exception.

### Boundaries, enforced at the commit

Two layers, and no third:

- **`spec.disabled`** carries every lock the step path honours: `meta.isSystemColumn`,
  `column.ordering === false`, an applied sort, an applied grouping (`moveRow`'s two early
  returns), and `ordering.row` / `ordering.column` being off. A locked item is not draggable.
- **`dropRow` / `dropColumn` refuse** a drop across a pin band, across a parent, or onto a locked
  or system item — the same rules `findNeighbour` applies to a step.

The accepted cost is that an illegal drop is refused **on release** rather than signalled during
the drag. An invalid-drop affordance is a Could, not a reason to reintroduce grouping.

### Commit

- **Rows**: `dropRow(table, rowId, targetRowId)` → one `RowMove` → `ordering.row.onChange`
  (controlled) or the `rowOrder` slice (uncontrolled). `direction` is derived from the resolved
  positions and is informational; the ids are the source of truth, stated in the docblock.
- **Columns**: `dropColumn(...)` → the full `ColumnOrderState` `ColumnOrderingConfig.onChange`
  already promises. Note `moveColumn` returns the **current order unchanged**, never `undefined`,
  and `canMoveColumn` is the boolean — so `dropColumn → ColumnOrderState | undefined` is a new
  convention rather than a mirror: align it or justify it in the docblock.
- **Tree rows commit only on the controlled path.** The uncontrolled `moveRow` API refuses
  non-top-level rows before any splice (`row-ordering-feature.ts`, `if (!isTopLevelRow(table, rowId)) return`),
  and the uncontrolled path first materialises a full order from `getCoreRowModel().rows` via
  `applyRowOrder` (`:167-170`), because `applyRowMove` returns the order unchanged when an id is
  absent. Dragging a child row is the first thing anyone will try, so the spec must say what
  happens.

### Attributes

`data-dragging` on the item, and an authored `data-slot` for the handle — without the latter,
`apps/docs/test/e2e-slots.test.ts` fails the moment a spec addresses it. `DragAxis` is a closed set
and takes the const-object-plus-union form. There is no `data-drop-edge`.

### RTL

Reduced to verification rather than design, now that no logical edge vocabulary is authored: the
column axis must behave correctly under `dir="rtl"`, checked by a spec, with the kits styling
through `inset-inline-*` as the pin shadows already do.

### Sensors and keys

Pointer, keyboard and touch. The activator is **always the drag handle element** — never the whole
header cell or row — which structurally keeps dnd-kit's Space/Enter pickup away from the sort
toggle and row selection. `Alt+Arrow` stays on the cell.

- `use-keyboard-navigation.ts` must stand down while a drag is active, and `Escape` must cancel the
  drag rather than exit the cell. **Both are needed as soon as _pointer_ drag exists.**
- Touch needs a delay activation constraint or a scroll gesture becomes a drag; pointer needs a
  distance threshold. Both are named constants.

### Announcements

dnd-kit ships live-region text. Every string goes through the `messages` catalogue beside
`messages.columnMenu.pinStart` and friends, together with the handle's `aria-roledescription` and
`aria-describedby`. Plausibly larger than the sensor it accompanies; its own phase.

### Virtualization

There is **no `rangeExtractor` anywhere in the repo**, and pinned rows do the opposite of what r1
claimed: `table.tsx:179` feeds the virtualizer `getCenterRows()` while `virtual-body.tsx` renders
top and bottom rows outside the window. Four requirements, one fewer than r2 now that no preview
rewrites positions per frame:

1. `index` is the real row index, not the position in the window.
2. The dragged row stays mounted — by adding a `rangeExtractor` or by reusing the out-of-window
   rendering pinned rows already use. Open question above.
3. `getItemKey` does not exist today (`table.tsx:182-188`) and must be added, keyed by row id, so
   identity survives the commit.
4. The auto-scroller is pointed at a decided scrollport; there are two candidates (`table.tsx:194`).

The virtual path gets its own spec rather than being inferred from the non-virtual one.

### SSR

The heroui grid prerenders at build time. The drag layer is inert until hydration and authors no
attributes that diverge between server and client.

### shadcn delivery

`blocks/dnd/` **cannot** simply be "a separate registry item excluded from the main payload":
`scripts/generate-shadcn-registry-manifest.mjs` walks `srcDir` recursively and emits exactly one
item (`items: [{ name, files }]`), and its only exclusion knob is `excludeTopLevel`, top-level only.
So the phase's real scope is **a generator change** — multi-item output with per-item file sets and
dependencies. Until that exists the alternatives are shipping `@dnd-kit` in every `shadcn add`
(unacceptable) or no shadcn DnD.

### Typing and lint

`exactOptionalPropertyTypes` means `DragSpec`'s optional members cannot be passed as `undefined`,
and dnd-kit's types are not written under that flag — the adapter boundary pays for it. An optional
peer means importing a package absent from `dependencies`, so `import/no-extraneous-dependencies`
and the resolver need configuring for the new subpath; any adapter-present guard that lints as
unnecessary takes a scoped disable with the "do not tidy this up" comment discipline AGENTS.md
demands of the feature-optionality guards.

**Technical Risks**

| Risk                                                                      | Likelihood | Mitigation                                                                                                                     |
| ------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A refactor imports the adapter from a kit's `data-grid.tsx` or `index.ts` | M          | The `bundledCodeOf()` guard; the same defect class already bit this repo via `DataGrid.Footer`                                 |
| A nested non-DnD grid inherits the ambient adapter                        | M          | Every root provides its own value                                                                                              |
| Adapter identity changes under a mounted tree                             | L          | Documented rule + dev warning; the sanctioned binding is build-time                                                            |
| `@dnd-kit/react` is pre-1.0 and moves                                     | M          | The port is the insulation; conservative peer range                                                                            |
| An illegal drop is only refused on release and reads as a bug             | M          | Locked items are not draggable at all, so only band/parent crossings reach release; the Could-tier affordance is the follow-up |
| Virtualized drag breaks invisibly                                         | M          | Its own spec; no inference from the non-virtual case                                                                           |
| Playwright `dragTo` unreliable on pointer DnD                             | H          | Explicit `mouse.down`/`move`/`up` steps                                                                                        |

---

## Implementation Phases

| #   | Phase                    | Description                                                                             | Status   | Parallel                                                                                                                                                                  | Depends  | PRP Plan                                                                                                                                                                           |
| --- | ------------------------ | --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Core drop helpers        | `dropRow` / `dropColumn` with the step refusals; tree-row behaviour stated              | complete | with 2                                                                                                                                                                    | -        | [`plans/completed/dnd-phase-1-core-drop-helpers.plan.md`](../plans/completed/dnd-phase-1-core-drop-helpers.plan.md) · [report](../reports/dnd-phase-1-core-drop-helpers-report.md) |
| 2   | The port                 | Types, no-op, per-root provider, dev warning, `dnd` on `CreateDataGridOptions`          | complete | with 1                                                                                                                                                                    | -        | [`plans/completed/dnd-phase-2-the-port.plan.md`](../plans/completed/dnd-phase-2-the-port.plan.md) · [report](../reports/dnd-phase-2-the-port-report.md)                            |
| 3   | heroui adapter + `/dnd`  | `adapter`, optional peer, tsup entry, `external`, size-limit, `bundledCodeOf` guard     | complete | [`plans/completed/dnd-phase-3-heroui-adapter.plan.md`](../plans/completed/dnd-phase-3-heroui-adapter.plan.md) · [report](../reports/dnd-phase-3-heroui-adapter-report.md) | 2        | -                                                                                                                                                                                  |
| 4   | Row drag                 | Handle + `data-slot`, commit, `isDragging` gate, `Escape`, pointer sensor               | complete | [`plans/completed/dnd-phase-4-row-drag.plan.md`](../plans/completed/dnd-phase-4-row-drag.plan.md) · [report](../reports/dnd-phase-4-row-drag-report.md)                   | 1, 3     | -                                                                                                                                                                                  |
| 5   | Header drag              | `dragHandle` in the render args **and** `HeaderCellProvider`; RTL verification          | complete | with 6, 9                                                                                                                                                                 | 4        | [`plans/completed/dnd-phase-5-header-drag.plan.md`](../plans/completed/dnd-phase-5-header-drag.plan.md) · [report](../reports/dnd-phase-5-header-drag-report.md)                   |
| 6   | Visibility-panel drag    | `ColumnMoveScope.All`; in `visibility-trigger.tsx`, not the kits                        | pending  | with 5, 9                                                                                                                                                                 | 4        | -                                                                                                                                                                                  |
| 7   | Keyboard + touch sensors | Activator discipline, named activation constants                                        | pending  | -                                                                                                                                                                         | 5, 6     | -                                                                                                                                                                                  |
| 8   | Announcements + ARIA     | `messages` keys, live region, `aria-roledescription` / `describedby`                    | pending  | -                                                                                                                                                                         | 7        | -                                                                                                                                                                                  |
| 9   | Virtualization           | Real index, mounted dragged row, `getItemKey`, scrollport decision, own spec            | pending  | with 5, 6                                                                                                                                                                 | 4        | -                                                                                                                                                                                  |
| 10  | shadcn registry          | Multi-item generator, then the DnD block as its own item                                | pending  | with 9                                                                                                                                                                    | 5, 6     | -                                                                                                                                                                                  |
| 11  | Docs, e2e, release       | Composed DnD grid for docs, page map + walk guard, READMEs, specs both kits, changesets | pending  | -                                                                                                                                                                         | 8, 9, 10 | -                                                                                                                                                                                  |

### Phase Details

**Phase 1 — Core drop helpers.** Goal: a drop validated exactly as a step is, and the only place
boundaries are enforced. Scope: `dropRow`, `dropColumn`, the return convention decided against
`moveColumn`, `direction` documented as derived and informational, and the tree-row rule written
down. Success: a drop across a band, across a parent, onto a locked or system item, or under an
applied sort or grouping is refused — one test each.

**Phase 2 — The port.** Goal: the shared package hosts an adapter without knowing one exists.
Scope: types, no-op, per-root provider, dev-mode identity warning, config field. Success: a grid
with no adapter renders identically; no `@dnd-kit` string in `packages/data-grid/react/react`; a
nested non-DnD grid does not inherit an outer adapter.

**Phase 3 — heroui adapter + subpath.** Goal: prove the delivery shape before building on it.
Scope: `src/dnd.ts`, `exports["./dnd"]`, tsup entry, `external` gains `@dnd-kit/react`, the kit's
first `peerDependenciesMeta`, a size-limit entry (which measures the adapter module alone, since
size-limit excludes peers — say so rather than implying more), and the `bundledCodeOf` guard.
Success: a clean install without `@dnd-kit/react` builds and runs; the root's size-limit number is
unchanged.

**Phase 4 — Row drag.** Goal: the first surface, end to end. Scope: the handle and its `data-slot`,
`useSortableItem` wiring, commit through `dropRow`, `data-dragging`, kit CSS for the dragging
state, pointer sensor, the `isDragging` gate and `Escape` cancellation. Success: a spec drags a row
three places in both kits and asserts `onChange` fired exactly once; neighbours visibly part during
the drag with no state written.

**Phase 5 — Header drag.** Scope: `dragHandle` added to the render args **and** to what
`HeaderCellProvider` publishes; the resizer stays its own activator; RTL verified. Success: a leaf
cannot leave its header group; the resizer still resizes; an RTL spec passes.

**Phase 6 — Visibility-panel drag.** Scope: `ColumnMoveScope.All` semantics, in
`visibility-trigger.tsx`. Success: hidden columns are valid neighbours in the panel and not in the
header, in one grid, in one spec.

**Phase 7 — Keyboard + touch sensors.** Scope: handle-only activators, named activation constants.
Success: a spec that sorts, selects, navigates and keyboard-drags in one grid with no key handled
twice.

**Phase 8 — Announcements + ARIA.** Scope: message keys, live-region wiring, handle ARIA. Success:
no English string literal in the drag path; a manual check of a full keyboard drag.

**Phase 9 — Virtualization.** Scope: the four requirements. Success: a spec drags a row from index
5 to index 400 in a virtualized grid.

**Phase 10 — shadcn registry.** Scope: teach the generator multi-item output, then add the DnD
block. Success: `registry:build` output for the main `data-grid.json` carries no `@dnd-kit`
reference.

**Phase 11 — Docs, e2e, release.** Scope: a composed DnD-bound grid for the docs app; the new page
added to `DocPage` **and** classified in `PAGE_ENTRIES` (or `DELIBERATELY_UNMAPPED` with a reason —
`CreateDataGridOptions` is not currently a mapped governing type, so a DnD options table needs that
resolved); `check-site-url.mjs` for any `npx shadcn add <url>` line; READMEs for heroui and
`data-grid-react`; specs both kits; changesets on `@ez-kit/data-grid-react` and
`@ez-kit/data-grid-heroui` — and on `@ez-kit/data-grid-core` for the new drop helpers — never
`@ez-kit/data-grid-shadcn`.

### Parallelism Notes

1 and 2 touch different packages. 5, 6 and 9 all sit on 4 and share no file — 9 is the virtual
path, 5 the header, 6 the panel. 7 needs both column surfaces present, because the key conflicts
only appear with a header handle in the tab order. 10 needs the surfaces settled so the block's
file set is final.

---

## Decisions Log

| Decision                          | Choice                                    | Alternatives                                                                                        | Rationale                                                                                                                                                                  |
| --------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mechanism                         | `@dnd-kit/react` 0.1.x                    | Legacy `core` + `sortable` (what TanStack's example uses); hand-rolled pointer; `@hello-pangea/dnd` | v2 applies transforms itself, so no inline style is authored anywhere; the legacy preset requires the consumer to write `style={{transform: CSS.Translate.toString(...)}}` |
| Is it a feature?                  | No — an affordance over existing ordering | A `dndFeature`                                                                                      | It writes the existing slices                                                                                                                                              |
| Where the dependency may be named | One module per kit, on `/dnd`             | Kit `data-grid.tsx`; kit `index.ts`                                                                 | A kit root is a prebuilt grid; an import there makes the peer required for every existing consumer                                                                         |
| How a project switches it on      | `createDataGrid({ dnd: adapter })` only   | `<DataGrid dnd>`; a second prebuilt bundle                                                          | Keeps the root byte-identical and the "kit root is everything" rule exception-free; accepted cost: no prebuilt quick start with DnD                                        |
| Adapter export name               | `adapter`                                 | `dndKitAdapter`, per `reactRouterAdapter`                                                           | A kit has exactly one and the path names it; asymmetry recorded deliberately                                                                                               |
| Contract growth                   | Config field                              | `core.DragDrop`; a `FEATURE_OPTIONAL_COMPONENTS` entry                                              | Leaves `FullGridComponents` untouched                                                                                                                                      |
| Port shape                        | Hooks                                     | Render-prop components (removes the Rules-of-Hooks hazard by construction)                          | Drag state stays beside the data that needs it, and one hook serves every surface through `axis` instead of one contract member per surface                                |
| Preview during drag               | None — library transforms                 | A grid-local preview order                                                                          | The sortable strategy already displaces neighbours without touching state                                                                                                  |
| `applyRowMove`                    | Unchanged                                 | Make it read `direction`                                                                            | The drop index comes from the collision model that drew the displacement, so an index splice is self-consistent — as `arrayMove` is in TanStack's example                  |
| Boundary enforcement              | `disabled` + refusal in the drop helpers  | A composite `group` key                                                                             | No two-facts-in-one-identifier encoding; cost is refusal on release                                                                                                        |
| Sensors                           | Pointer + keyboard + touch                | Pointer only                                                                                        | Interaction parity; announcements phased in beside the keyboard sensor                                                                                                     |
| Scope                             | All eleven phases                         | Defer virtualization and the panel                                                                  | Chosen deliberately after the trade was put                                                                                                                                |

---

## Research Summary

**Market Context**

One reference read rather than a survey: TanStack Table's own
`examples/react/row-dnd` (`https://tanstack.com/table/latest/docs/framework/react/examples/row-dnd`,
source at `TanStack/table/examples/react/row-dnd/src/main.tsx`). It uses legacy `@dnd-kit/core` +
`sortable` + `modifiers` + `utilities`, `getRowId: row => row.userId`, holds the order **in the data
array** rather than a state slice, displaces neighbours with `useSortable`'s `transform` **during**
the drag without modifying state, and reorders once on `dragEnd` with
`arrayMove(data, oldIndex, newIndex)` under `verticalListSortingStrategy`, `closestCenter` and
`restrictToVerticalAxis`. Three of r3's four removals follow directly from reading it.

**Technical Context**

- `core/src/features/ordering/` — `moveRow`/`canMoveRow`/`applyRowMove`/`applyRowOrder`,
  `moveColumn`/`canMoveColumn`, `ColumnMoveScope`, the direction enums, and the refusals.
  `moveRow` refuses under sorting **and** grouping via two early returns; `findNeighbour` refuses on
  band and parent mismatch; `isMovable` = `meta?.isSystemColumn !== true && meta?.ordering !== false`.
  `applyRowMove` splices to the target's index and never reads `direction`.
- `core/src/types.ts:646-704` — `ColumnOrderingConfig` (`:646`, `visibilityMenu` `:665`),
  `RowOrderingConfig` (`:681`), `OrderingConfig` (`:699-704`).
- `core/src/features/ordering/row-ordering-feature.ts:126,128,167-170` — the feature, its `rowOrder`
  slice, the materialise-then-splice uncontrolled path, and the top-level-only refusal.
  `columnOrderingFeature` is TanStack's own, re-exported at `core/src/features/entry.ts:32`.
- `react/react/src/create-data-grid.tsx:24,84,240` — where `dnd` goes, the `keyboardNavigation`
  precedent, the compound `Object.assign`. Called once per kit at `src/data-grid.tsx:116`.
- `react/react/src/data-grid/header-cell.tsx:46-78,432-443` — the render args type and object, whose
  ten members are `header, column, canSort, sortDirection, label, sortTrigger, menu, filter,
filterPopover, resizer`; also published through `HeaderCellProvider`, so `dragHandle` lands twice.
- `react/react/src/data-grid/visibility-trigger.tsx:59` — the panel's ordering logic, shared, not
  per kit.
- `react/react/src/data-grid/table.tsx:179,182-188,194`, `virtual-body.tsx`, `virtual-context.tsx` —
  `getCenterRows()` into the virtualizer, no `getItemKey`, two scrollport candidates. No
  `rangeExtractor` exists anywhere in the repo.
- All 12 `createContext` calls in `react/react/src` are at module scope.
- `va-store/package.json:54-57,175,183-185` + `src/persist/url/react-router.ts` — the delivery
  pattern: own subpath, optional peer, tsup entry, size-limit entry, and a two-line re-export shim
  imported by nothing but its own test (`src/persist/react-router.test.tsx:11`). The adapter is
  `reactRouterAdapter` (`store-persist/src/url/react-router.ts:12`).
- heroui kit — 15 feature/cell-type subpaths with matching tsup entries and per-entry size-limit
  objects; no `peerDependenciesMeta` yet; `external: ['react','react-dom']` must gain `@dnd-kit/react`.
- `apps/docs/test/tree-shaking/bundle.ts` — `workspaceOnly` externalises non-`@ez-kit` specifiers;
  `entryPointOf()` folds subpaths onto the package name; `bundledCodeOf()` is the usable guard.
- `scripts/generate-shadcn-registry-manifest.mjs` — single-item output, `excludeTopLevel` only.
- `@dnd-kit/*` is absent from every `package.json` and from `pnpm-lock.yaml`.

---

_Generated: 2026-09-28 (revision 3)_
_Status: DRAFT - needs validation_

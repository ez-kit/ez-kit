# Plan: DnD Phase 4 — Row drag

## Summary

The first rendered drag affordance, end to end: a row owns its sortable, publishes a `dragHandle`
element and `isDragging` through both `DataGridRowRenderArgs` and `RowProvider`, and a
`<DataGrid.RowDragHandle />` reads the same thing for a call site that would rather not write a
render function. A drop commits once through `table.ordering.dropRow`. Both kits get a handle block
and the CSS for the dragging state; both kits get an adapter, so the Playwright spec runs on the
project matrix as the PRD requires.

## User Story

As someone rearranging an order queue,
I want to drag a row by its handle and drop it where I mean,
so that moving a row five places is one gesture instead of five menu round-trips.

## Problem → Solution

Phases 1–3 built everything behind the affordance and nothing a user can touch: the drop helpers
exist, the port exists, an adapter exists, and no grid mounts the adapter's `Provider` or renders a
handle. `useDndEnabled()` is therefore `true` for a DnD-bound bundle while nothing is draggable.
→ `DataGridControlled` mounts `adapter.Provider` with an `onDrop` that calls
`table.ordering.dropRow(sourceId, targetId)`; `DataGridRow` calls `useSortableItem` and lands its
`ref` on the `<tr>` beside the pinning ref; the handle is a kit component behind `core.Button`;
the keyboard model stands down mid-drag and `Escape` cancels.

## Metadata

- **Complexity**: **Large** — 16 files across five packages. See _Notes_ for the split option.
- **Source PRD**: `.claude/PRPs/prds/data-grid-dnd.prd.md` (revision 3)
- **PRD Phase**: Phase 4 — Row drag
- **Depends on**: Phases 1 (`fd8f55dc`-), 2 (`fd8f55dc`), 3 (`845ad093`) — all complete
- **Unblocks**: Phases 5, 6, 9 (all sit on this and share no file with each other)
- **Decided with the user**: the handle is published **both** ways — render args + provider, _and_ a
  standalone component — mirroring `HeaderCell`, which publishes its render args through
  `HeaderCellProvider` too. Phase 5 repeats the shape for the header.

---

## UX Design

### Before

```
┌──────────────────────────────────────────────┐
│ ⋮  Order #1042   Pending    £240.00          │  ← "Row order" menu → "Move up"
│ ⋮  Order #1043   Shipped    £ 88.50          │     one step per open-click-close cycle
│ ⋮  Order #1044   Pending    £ 12.00          │     five places = five cycles
└──────────────────────────────────────────────┘
```

### After

```
┌──────────────────────────────────────────────┐
│ ⠿  Order #1042   Pending    £240.00          │  ← grab the handle
│ ⠿ ┄┄┄┄┄┄┄┄┄┄┄┄ dragging ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │     neighbours part by transform,
│ ⠿  Order #1044   Pending    £ 12.00          │     no state written mid-drag
└──────────────────────────────────────────────┘
        release → one commit, one onChange
        Escape  → snaps back, nothing written
```

### Interaction Changes

| Touchpoint             | Before                   | After                                                         | Notes                                              |
| ---------------------- | ------------------------ | ------------------------------------------------------------- | -------------------------------------------------- |
| Reordering a row       | menu entry, one step     | drag by handle, any distance; menu and `Alt+Arrow` unchanged  | Fourth affordance, not a replacement               |
| `<tr>` attributes      | `data-movable="true"`    | + `data-dragging="true"` while this row is the drag source    | `data-movable` already exists and is untouched     |
| Keyboard model         | arrows move the tab stop | stands down while a drag is active; `Escape` cancels the drag | shadcn only — heroui runs React Aria's manager     |
| A grid with no adapter | —                        | unchanged, byte for byte                                      | The handle renders `null` behind `useDndEnabled()` |

---

## Mandatory Reading

| Priority | File                                                                                          | Lines                    | Why                                                                                                                                                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | `packages/data-grid/react/react/src/data-grid/row.tsx`                                        | all (272)                | **The file this phase changes most.** `DataGridRowRenderArgs` (`:28-40`), the `forwardRef` shape and why (`:135-137`), the `Alt+Arrow` handler (`:205-222`), the attribute block (`:246-266`), and `renderRowContent` + `RowProvider` (`:79-113`). |
| P0       | `packages/data-grid/react/react/src/data-grid/dnd/{types,context}.tsx`                        | all                      | The port being consumed: `DragSpec`, `SortableItemHandle`, `DndDropEvent`, `useSortableItem`, `useDndEnabled`, `DndAdapterProvider`.                                                                                                               |
| P0       | `packages/data-grid/core/src/features/ordering/row-ordering-feature.ts`                       | 33-35, 197-214           | `canDropRow` / `dropRow` on `table.ordering` — the commit, controlled and uncontrolled handled inside. **The whole commit is one call.**                                                                                                           |
| P0       | `packages/data-grid/react/react/src/data-grid/data-grid.tsx`                                  | 341-400                  | `DataGridControlled`'s provider tree, where `DndAdapterProvider` already sits, and where `adapter.Provider` now goes inside it.                                                                                                                    |
| P0       | `packages/data-grid/react/heroui/src/blocks/resizing/Resizer.tsx` and the shadcn twin         | all                      | **The nearest existing affordance**, and the pattern for the handle: a `blocks/` component, `cursor-*` as a Tailwind class on the element, shadcn swapping a class on state and heroui stamping `data-resizing`.                                   |
| P1       | `packages/data-grid/react/react/src/data-grid/keyboard-navigation/use-keyboard-navigation.ts` | 24-25, 186-206           | The `EDITING_CELL_ATTR` gate — **the precedent for the drag gate**: the nav hook bails by reading a DOM attribute, not a context or a subscription.                                                                                                |
| P1       | `apps/docs/e2e/fixtures.ts`                                                                   | 56, 75-115               | `BODY_ROW = '[data-slot="tbody"] [data-slot="tr"][data-row-id]'`, `grid.open`, `rows()`, `boxOf`. The spec is written against these.                                                                                                               |
| P1       | `apps/docs/e2e/packages/data-grid/columns/resizing.spec.ts`                                   | 40-60                    | **The only real drag in the repo.** Two-step `page.mouse.move` either side of `down`/`up`; a single jump is dropped by the browser. Copy this shape.                                                                                               |
| P1       | `apps/docs/e2e/packages/data-grid/ordering/rows.spec.ts`                                      | all                      | The menu-driven row-ordering spec: how row order is asserted (`evaluateAll` over `data-row-id`), and the cases the drag spec must not duplicate.                                                                                                   |
| P1       | `packages/data-grid/react/shadcn/src/styles.css` / heroui's                                   | the `data-pinned` blocks | Both kits style a shared `data-*` state with plain CSS attribute selectors consuming `--dg-*` custom properties. Not Tailwind `data-[…]:` variants — that layer is shadcn's own primitives.                                                        |
| P1       | `packages/data-grid/core/src/messages/{types,defaults}.ts`                                    | the `visibility` group   | The catalogue's shape, and the nearest sibling: `visibility.moveStart` / `.moveEnd`. The new group goes in beside these two files.                                                                                                                 |
| P2       | `packages/data-grid/react/shadcn/registry.config.mjs`                                         | 78                       | `excludeTopLevel: ['index.ts', 'index.test.ts']` — the knob that lets the shadcn adapter exist without entering the registry payload. See _Findings_.                                                                                              |
| P2       | `apps/docs/shared/DataGrid.tsx`                                                               | all (48)                 | The kit switcher, and why a **second** one is needed: it lazy-loads each kit's _prebuilt_ grid, and DnD is composed-only.                                                                                                                          |
| P2       | `apps/docs/shared/data-grid/examples/{manifest.json,registry.ts}`                             | —                        | Registering an example: id → sourceFile + exportName, **and** sourceFile → dynamic import. Missing the second one throws at render and passes lint, typecheck and build.                                                                           |
| P2       | `packages/data-grid/react/react/src/data-grid/virtual-body.tsx`                               | 100-130                  | `registerTopRow(index)` / `registerBottomRow(index)` — the only existing consumer of `DataGridRow`'s `ref`, and half of the ref-merging problem.                                                                                                   |

## External Documentation

| Topic              | Source                       | Key Takeaway                                                                                                                                                                |
| ------------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useSortable` refs | `@dnd-kit/react@0.1.21` docs | `ref` on the element that moves, `handleRef` on the activator. Already mapped by the phase-3 adapter; this phase only decides where each lands.                             |
| Keyboard cancel    | dnd-kit `KeyboardSensor`     | `Escape` is dnd-kit's own cancel while a drag is active, reported as `canceled: true` — which the adapter already refuses. **So the grid must not swallow `Escape` first.** |

```
KEY_INSIGHT: dnd-kit cancels on Escape itself and reports it as `canceled: true`.
APPLIES_TO:  Task 6 — the keyboard gate.
GOTCHA:      The work is *not* wiring a cancel; it is making the grid's own `Escape` handler stand
             down so dnd-kit's reaches the document. Writing a second cancel would double-handle it.
```

---

## Patterns to Mirror

### ROW_ATTRIBUTE_BLOCK

```tsx
// SOURCE: src/data-grid/row.tsx:246-266
<Tr
	{...consumerProps}
	{...navigationProps}
	ref={ref}
	data-slot='tr'
	data-row-id={row.id}
	data-row-selected={isSelected ? 'true' : undefined}
	…
	{...(canMove ? { 'data-movable': 'true' } : {})}
>
```

### RENDER_ARGS_PLUS_PROVIDER

```tsx
// SOURCE: src/data-grid/row.tsx:90-113 — args built once, published to children as context
const args: DataGridRowRenderArgs<TRow> = { row, cells, get content() { … } }
const content = children === undefined ? args.content : typeof children === 'function' ? children(args) : children

return <RowProvider value={args}>{content}</RowProvider>
```

### DOM_ATTRIBUTE_GATE

```ts
// SOURCE: src/data-grid/keyboard-navigation/use-keyboard-navigation.ts:24-25, 196-199
/** Marks the cell currently open for editing — the editor owns `Escape` and `Enter` there. */
const EDITING_CELL_ATTR = 'data-editing-cell'
// …
if (event.key !== 'Escape') return
// The editor's own `Escape` cancels the edit; taking it here would swallow that.
if (cell.hasAttribute(EDITING_CELL_ATTR)) return
```

### OPTIONAL_FEATURE_READ

```tsx
// SOURCE: src/data-grid/row.tsx:160-162 — the scoped disable and the comment discipline it needs
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
const isSelected = useDataGridState(() => row.getIsSelected?.() ?? false)
```

### KIT_AFFORDANCE_BLOCK

```tsx
// SOURCE: packages/data-grid/react/shadcn/src/blocks/resizing/Resizer.tsx
className={cn(
	'absolute inset-y-0 right-0 w-[2px] cursor-col-resize touch-none select-none rounded-full bg-border my-2',
	isResizing && 'bg-primary',
)}
```

```tsx
// SOURCE: packages/data-grid/react/heroui/src/blocks/resizing/Resizer.tsx — heroui stamps state instead
className = 'absolute top-0 right-0 w-4 h-full cursor-col-resize select-none touch-action-none py-2'
// plus data-resizing={isResizing ? 'true' : undefined}
```

### KIT_STATE_CSS

```css
/* SOURCE: packages/data-grid/react/shadcn/src/styles.css — plain attribute selectors, shared custom properties */
[data-slot='tr'][data-pinned] > [data-slot='td'] {
	background-color: var(--dg-pin-cell-background);
}
```

### E2E_DRAG

```ts
// SOURCE: apps/docs/e2e/packages/data-grid/columns/resizing.spec.ts:46-55
const handle = await boxOf(resizerIn(header))
const y = handle.y + handle.height / 2
const x = handle.x + handle.width / 2

await page.mouse.move(x, y)
await page.mouse.down()
await page.mouse.move(x + dx / 2, y) // two-step: a browser starts a drag only once the pointer
await page.mouse.move(x + dx, y) // has travelled; a single jump is dropped
if (midDrag) await midDrag()
await page.mouse.up()
```

### E2E_ORDER_ASSERTION

```ts
// SOURCE: apps/docs/e2e/fixtures.ts:108-112
await expect(page.locator(BODY_ROW).first()).toBeVisible()
return page.locator(BODY_ROW).evaluateAll((rows) => rows.map((row) => row.getAttribute('data-row-id')))
```

---

## Files to Change

| File                                                                                      | Action        | Justification                                                           |
| ----------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| `…/react/react/src/utils/merge-refs.ts`                                                   | CREATE        | No such helper exists; the `<tr>` now needs two refs                    |
| `…/react/react/src/data-grid/row-drag-handle.tsx`                                         | CREATE        | `<DataGrid.RowDragHandle />`                                            |
| `…/react/react/src/data-grid/row.tsx`                                                     | UPDATE        | Owns the sortable; `data-dragging`; publishes `dragHandle`/`isDragging` |
| `…/react/react/src/data-grid/data-grid.tsx`                                               | UPDATE        | Mounts `adapter.Provider`; the commit; the compound member              |
| `…/react/react/src/data-grid/keyboard-navigation/use-keyboard-navigation.ts`              | UPDATE        | Stands down mid-drag; leaves `Escape` to dnd-kit                        |
| `…/react/react/src/index.ts`                                                              | UPDATE        | Export the component and its props type                                 |
| `…/react/react/src/data-grid/row-drag.test.tsx`                                           | CREATE        | Unit coverage for the gate, the commit and the attributes               |
| `…/core/src/messages/{types,defaults}.ts`                                                 | UPDATE        | One `ordering` group, one key                                           |
| `…/react/heroui/src/blocks/core/RowDragHandle.tsx` + registration                         | CREATE        | The kit's handle visual                                                 |
| `…/react/heroui/src/styles.css`                                                           | UPDATE        | `data-dragging` styling                                                 |
| `…/react/shadcn/src/blocks/core/RowDragHandle.tsx` + registration                         | CREATE        | Same, shadcn                                                            |
| `…/react/shadcn/src/styles.css`                                                           | UPDATE        | Same                                                                    |
| `…/react/shadcn/src/dnd.tsx` + `package.json` + `tsup.config.ts` + `registry.config.mjs`  | CREATE/UPDATE | The shadcn adapter, excluded from the registry payload                  |
| `apps/docs/shared/DataGridDnd.tsx`                                                        | CREATE        | A second switcher over **composed** per-kit bundles                     |
| `apps/docs/shared/data-grid/examples/{components/row-drag.tsx,manifest.json,registry.ts}` | CREATE/UPDATE | The example the spec drives                                             |
| `apps/docs/e2e/packages/data-grid/ordering/row-drag.spec.ts`                              | CREATE        | The browser proof                                                       |
| `.changeset/dnd-row-drag.md`                                                              | CREATE        | `data-grid-react`, `data-grid-core`, `data-grid-heroui`                 |

## NOT Building

- **No header drag, no panel drag, no virtualized drag.** Phases 5, 6, 9 — they sit on this and
  share no file with each other.
- **No keyboard or touch sensor configuration.** Phase 7. This phase takes dnd-kit's defaults, and
  the only keyboard work here is making the grid's own model stand down.
- **No announcements, no live region, no `aria-roledescription` / `aria-describedby`.** Phase 8.
  One `messages` key for the handle's accessible name is in scope; see _Notes_.
- **No shadcn registry item for the DnD block.** Phase 10. The shadcn adapter lands here
  _excluded_ from the payload, which is a different thing — see _Findings_.
- **No docs page.** Phase 11. The example this phase adds exists for the spec; the page that
  documents it comes later.
- **No system column, no `rowActions.column` slot, no placement option.** The PRD forbids all three.
- **No `data-drop-edge`, no preview order, no `applyRowMove` change.** Removed in PRD r3.

---

## Step-by-Step Tasks

### Task 1: `mergeRefs`

- **ACTION**: Create `…/react/react/src/utils/merge-refs.ts`.
- **IMPLEMENT**: `export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T>` —
  assigns to each `MutableRefObject` and calls each callback. Docblock says why it exists: the
  `<tr>` carries the pinning measurement ref from `virtual-body.tsx` **and** the sortable's ref,
  and this package had no such helper because until now nothing needed two.
- **MIRROR**: the `utils/` neighbours (`class-names.ts`, `text-entry-target.ts`) for size and register.
- **IMPORTS**: `import type { Ref, RefCallback } from 'react'`.
- **GOTCHA**: Return a **stable** callback at the call site (`useCallback` over the two refs) or
  every render detaches and reattaches both, which for the sortable means re-registering the
  draggable mid-drag. React calls a changed ref callback with `null` then the node.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react typecheck`.

### Task 2: The row owns the sortable

- **ACTION**: Update `…/src/data-grid/row.tsx`.
- **IMPLEMENT**:
  - `const isDndEnabled = useDndEnabled()` and `const canMove = table.grid.ordering.row` (already
    read at `:205`). The spec is built only when both hold.
  - `const rowIndex = row.index` — **the real index**, which is what `DragSpec.index` documents.
  - `const disabled = !isDndEnabled || !canMove || isGroupRow || !table.ordering.canDropRow(row.id, row.id)`
    — no: `canDropRow(id, id)` is a self-drop and always false. Use
    `disabled: !canMove || isGroupRow` and let the drop helpers refuse the rest on release, which
    is the boundary model the PRD settled. A group row is excluded here because it is not a record
    and has nothing to reorder.
  - `const { ref: sortableRef, handleRef, isDragging } = useSortableItem({ id: row.id, index: rowIndex, axis: DragAxis.Row, disabled })`
    — called **unconditionally**, as a hook must be, whatever `isDndEnabled` says. That is the
    whole reason the port's no-op exists.
  - `ref={mergedRef}` where `mergedRef = useCallback(mergeRefs(ref, sortableRef), [ref, sortableRef])`.
  - `{...(isDragging ? { 'data-dragging': 'true' } : {})}` in the attribute block, after
    `data-movable`.
  - Extend `DataGridRowRenderArgs` with `dragHandle: ReactNode` and `isDragging: boolean`, built in
    `renderRowContent`. `dragHandle` is `isDndEnabled && canMove ? <RowDragHandle /> : null` — a
    ready element, like `HeaderCell`'s `sortTrigger` and `resizer`, not a ref.
  - `renderRowContent` gains the two values as parameters; it already receives what it needs
    otherwise.
- **MIRROR**: ROW_ATTRIBUTE_BLOCK, RENDER_ARGS_PLUS_PROVIDER, OPTIONAL_FEATURE_READ.
- **IMPORTS**: `import { DragAxis, useDndEnabled, useSortableItem } from './dnd'`;
  `import { mergeRefs } from '../utils/merge-refs'`; `import { RowDragHandle } from './row-drag-handle'`.
- **GOTCHA**: Three, all load-bearing.
  1. **`exactOptionalPropertyTypes`** — `disabled` is a definite boolean here, so pass it plainly;
     do not reach for the conditional spread the port documents for the optional case.
  2. **The `ref` merge must be memoised** (Task 1's gotcha).
  3. **`row.index` is the index in the current row model**, which is what the sortable wants.
     Do not substitute an array position from a `map` — that is the slice-relative index
     `DragSpec.index` explicitly forbids, and phase 9 depends on this being right now.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react test` after Task 8; a grid without an
  adapter must render identical DOM (the phase-2 test already asserts this and must stay green).

### Task 3: The handle component

- **ACTION**: Create `…/src/data-grid/row-drag-handle.tsx`.
- **IMPLEMENT**:
  - `export type DataGridRowDragHandleProps = { children?: ReactNode; 'aria-label'?: string }`.
  - Reads `useDataGridRow()` for the row's args (which now carry `isDragging`) — **but the
    `handleRef` is not in the render args**, because a ref is not a rendered value and putting one
    there would invite a call site to land it on the wrong element. Publish it through a small
    context of its own from `row.tsx`, alongside `RowProvider`: `RowDragProvider` with
    `{ handleRef, isDragging }`. The component returns `null` when that context is absent, which
    covers both "no adapter" and "rendered outside a row".
  - Renders `core.Button` with `ref={handleRef}`, `data-slot='row-drag-handle'`,
    `aria-label={props['aria-label'] ?? messages.ordering.dragRow}`, and `children` if given.
  - Docblock: the activator is **always this element**, never the row — which is what keeps a
    keyboard pickup away from row selection and the `Alt+Arrow` chord.
- **MIRROR**: the smallest existing compound child that renders one `core` primitive behind a
  registration check — `clear-filters-button.tsx` is the closest in shape.
- **IMPORTS**: `useGridComponents`, `useGridMessages`, the new `useRowDrag` context hook.
- **GOTCHA**: `data-slot='row-drag-handle'` is authored **here**, in the shared package, and
  `apps/docs/test/e2e-slots.test.ts` compares spec selectors against slots this package writes — so
  the spec's locator and this literal must match exactly, or that test fails. Do not let a kit
  overwrite it: heroui's own components sometimes stamp their own `data-slot` after spreading
  (documented for `Chip`), so the handle must be a `core.Button`, which forwards props.
- **VALIDATE**: `pnpm --filter @ez-kit/docs test -- e2e-slots` once the spec exists.

### Task 4: Mount the provider and commit the drop

- **ACTION**: Update `DataGridControlled` in `…/src/data-grid/data-grid.tsx`.
- **IMPLEMENT**: Inside `DndAdapterProvider` (so the adapter is resolvable) render the adapter's
  own `Provider` when there is one, with
  `onDrop={({ axis, sourceId, targetId }) => { if (axis === DragAxis.Row) table.ordering.dropRow(sourceId, targetId) }}`.
  A component of its own — `GridDndProvider` — because it has to call a hook to read the adapter
  and must render `children` unchanged when there is none. Wrap the `onDrop` in `useCallback` keyed
  on the table. **This closes the M1 caveat carried since phase 2**; update the `@remarks` in
  `dnd/types.ts` to say the grid now mounts it, and drop the paragraph from the phase-2 changeset's
  successor rather than editing a published one.
- **MIRROR**: `GridBody` (`data-grid.tsx:286-291`) — a tiny component that reads DI and falls back.
- **IMPORTS**: `useDndAdapter` from `./dnd`.
- **GOTCHA**: The column axis is deliberately **unhandled** here and must not be silently dropped
  — phase 5 adds `dropColumn`. Write the branch as a `switch` or an explicit `if` on
  `DragAxis.Row` with a comment naming phase 5, so the gap is visible rather than implied.
  `table.ordering.dropRow` is safe to call unconditionally: it reads its own config and returns
  early when row ordering is off.
- **VALIDATE**: the unit test in Task 8 asserting exactly one `onChange` per drop.

### Task 5: The messages key

- **ACTION**: Update `…/core/src/messages/types.ts` and `defaults.ts`.
- **IMPLEMENT**: A new top-level group `ordering: { dragRow: string }`, default `'Reorder row'`.
  Docblock: the group is new because reordering had no user-visible string of its own — the menu
  entries live under `columnMenu` and `visibility` — and phases 5–8 will extend this group rather
  than add siblings.
- **MIRROR**: the `visibility` group, which holds `moveStart` / `moveEnd` for the same feature seen
  from the panel.
- **IMPORTS**: none.
- **GOTCHA**: This is the one string this phase adds, and it is **not** preempting phase 8. Phase 8
  owns the live region, `aria-roledescription` and `aria-describedby`; an icon-only button with no
  accessible name is not a thing to ship for four phases while waiting for it. Say so in the
  docblock so phase 8 does not read this as a duplicate.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-core test`; `apps/docs/test/docs-option-names.test.ts`
  is unaffected (messages are not an option table).

### Task 6: The keyboard gate

- **ACTION**: Update `…/keyboard-navigation/use-keyboard-navigation.ts`.
- **IMPLEMENT**: A `DRAGGING_ATTR = 'data-dragging'` constant beside `EDITING_CELL_ATTR`, and an
  early return at the top of the key handler when `root.querySelector(`[${DRAGGING_ATTR}]`)` is
  non-null. Comment: while a drag is in flight the grid's arrows would fight the sensor for the
  same keys, and **`Escape` must reach dnd-kit**, which cancels the drag itself and reports
  `canceled: true` — a second cancel here would double-handle it.
- **MIRROR**: DOM_ATTRIBUTE_GATE.
- **IMPORTS**: none.
- **GOTCHA**: A DOM read, not a context subscription — deliberately, and for the same reason the
  editing gate is one: this handler runs on every keystroke in the grid and must not re-render
  anything to answer the question. Also note this hook is **only live in the shadcn kit**
  (`keyboardNavigation: true`); heroui runs React Aria's manager, so the gate is untestable there
  and the spec must not assume it.
- **VALIDATE**: the unit test in Task 8; the spec's `Escape` case runs on the shadcn project.

### Task 7: The kit handles and CSS

- **ACTION**: Create `RowDragHandle.tsx` in each kit's `blocks/core/`, register it in that kit's
  `core-components.ts`, and add the dragging-state CSS to each `styles.css`.
- **IMPLEMENT**: Per kit, a button rendering a grip glyph (`GripVertical` from `lucide-react`,
  which both kits already depend on), `cursor-grab` and `active:cursor-grabbing` as Tailwind
  classes on the element — **exactly where `Resizer.tsx` puts `cursor-col-resize`**, not in
  `styles.css`. In each `styles.css`, a `[data-slot='tr'][data-dragging]` rule: reduced opacity and
  a raised `z-index`, using the kit's own tokens, following the `data-pinned` blocks' selector
  shape.
  **The handle is not a new contract slot.** It is the existing `core.Button` with a `data-slot`,
  per the PRD's "new UI is composed from `core` primitives" rule — so `FullGridComponents` does not
  grow and no external kit breaks.
- **MIRROR**: KIT_AFFORDANCE_BLOCK, KIT_STATE_CSS.
- **IMPORTS**: per kit's existing block conventions.
- **GOTCHA**: `touch-none` on the handle in both kits — without it a touch drag scrolls the page
  instead. The resizer already carries it (`touch-none` / `touch-action-none`), which is why it is
  worth copying rather than deriving. Note the two kits spell it differently today; keep each kit's
  own spelling rather than unifying, since that is a pre-existing difference and not this phase's
  business.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-shadcn test && pnpm --filter @ez-kit/data-grid-heroui test`.

### Task 8: Unit tests

- **ACTION**: Create `…/react/react/src/data-grid/row-drag.test.tsx`.
- **IMPLEMENT**:
  1. No adapter → no handle in the DOM, no `data-dragging`, and the row's markup is identical to a
     grid rendered without the DnD providers at all.
  2. With a test adapter → the handle renders with `data-slot='row-drag-handle'` and the accessible
     name from `messages`.
  3. The spec handed to `useSortableItem` carries `axis: 'row'`, the row's **real** `index`, and
     `disabled: true` for a group row and for a grid with `ordering.row` off.
  4. `isDragging` from the adapter puts `data-dragging="true"` on the `<tr>` and nowhere else.
  5. A drop event from the adapter calls `table.ordering.dropRow` once with the two ids, and
     `ordering.row.onChange` fires **exactly once**.
  6. A drop on the **column** axis does not call `dropRow`.
  7. The keyboard gate: with `data-dragging` present, an `ArrowDown` on a cell does not move the tab
     stop.
  8. The merged ref: the row's `ref` prop still receives the `<tr>` element while the sortable also
     holds it.
- **MIRROR**: `dnd/dnd.test.tsx` (the phase-2 file) for the test-adapter double and register;
  `test-utils.tsx`'s `renderGrid` for the harness.
- **IMPORTS**: the phase-2 test adapter shape, `renderGrid`, `testComponents`.
- **GOTCHA**: The test adapter must be able to **fire** a drop on demand — give it a
  `fireDrop(event)` that calls the `onDrop` it was handed. Its `Provider` must therefore capture
  that prop. This is the only way to test the commit without a browser.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react test`.

### Task 9: The shadcn adapter, excluded from the payload

- **ACTION**: Create `…/react/shadcn/src/dnd.tsx`; update that package's `package.json`,
  `tsup.config.ts` and `registry.config.mjs`.
- **IMPLEMENT**: The same adapter as heroui's (Task 2 of phase 3 — copy it, including
  `toDropEvent` and its five refusals), the same optional-peer wiring, and
  `excludeTopLevel: ['index.ts', 'index.test.ts', 'dnd.tsx', 'dnd.test.tsx']` in
  `registry.config.mjs`.
- **MIRROR**: `packages/data-grid/react/heroui/src/dnd.tsx` verbatim where it can be.
- **IMPORTS**: as heroui's.
- **GOTCHA**: **This is the task that could ship `@dnd-kit` to every `npx shadcn add`, and the
  guard against it is one line.** `scripts/generate-shadcn-registry-manifest.mjs`
  (`assertTopLevelCoverage`) _throws_ on an unaccounted top-level entry, so forgetting the
  `excludeTopLevel` addition fails the build loudly rather than quietly — good. But listing it in
  `rootFiles` by mistake would include it silently. After the change, read
  `apps/docs/public/r/data-grid.json` and confirm no `@dnd-kit` appears; add that assertion to the
  guard suite rather than doing it by hand once.
  Also note the shadcn kit is **`private` and changesets-ignored** — it must not appear in this
  phase's changeset.
- **VALIDATE**: `pnpm --filter @ez-kit/docs registry:build`, then
  `grep -c '@dnd-kit' apps/docs/public/r/data-grid.json` → 0. Extend the phase-3 bundle guard to
  cover the shadcn kit's built entries too.

### Task 10: The docs example

- **ACTION**: Create `apps/docs/shared/DataGridDnd.tsx` and the example component; register it.
- **IMPLEMENT**:
  - `DataGridDnd.tsx`: the same runtime-switch shape as `shared/DataGrid.tsx`, but lazy-loading a
    per-kit module that calls `createDataGrid({ components: allComponents, cellTypes, features: allDataGridFeatures, dnd: adapter })`.
    Two small modules, one per kit, because the adapter import must not be in a shared module — it
    would put `@dnd-kit` in the bundle of every docs page.
  - `components/row-drag.tsx`: a grid with `ordering={{ row: true }}`, a first column whose
    `cell.component` renders `<DataGrid.RowDragHandle />`, and stable row ids.
  - Register in `manifest.json` (`id` → `sourceFile` + `exportName`) **and** in `registry.ts`
    (`sourceFile` → dynamic import).
- **MIRROR**: `shared/DataGrid.tsx` for the switcher; any existing example component for the rest.
- **IMPORTS**: per kit.
- **GOTCHA**: **Missing the `registry.ts` entry throws only at render** — lint, typecheck and build
  all pass, per AGENTS.md. And `scripts/verify-manifest-coverage.mjs` asserts every manifest
  example is referenced from some `.mdx`; this example has no page until phase 11, so either
  reference it from a page stub or check whether that script runs in CI (it is documented as
  "run manually") before assuming it will not fail.
- **VALIDATE**: `pnpm docs:dev`, open `/examples/heroui/row-drag` and `/examples/shadcn/row-drag`,
  drag a row by hand in each.

### Task 11: The browser spec

- **ACTION**: Create `apps/docs/e2e/packages/data-grid/ordering/row-drag.spec.ts`.
- **IMPLEMENT**, all through the `grid` fixture so the project matrix runs each case per kit:
  1. Dragging row 1 onto row 4 reorders the `data-row-id` sequence accordingly, and `onChange`
     fired once (assert via a count the example renders into the DOM).
  2. Mid-drag, `data-dragging="true"` is on the source row and the order in the DOM has **not**
     changed — the displacement is a transform, not a state write.
  3. `Escape` mid-drag leaves the order untouched.
  4. A grid with `ordering.row` off renders no handle.
- **MIRROR**: E2E_DRAG for the pointer sequence (two-step moves either side of `down`/`up`),
  E2E_ORDER_ASSERTION for reading the order.
- **IMPORTS**: `test`, `expect`, `boxOf` from `../../../fixtures`.
- **GOTCHA**: Playwright's `dragTo` is used **nowhere** in this repo and is documented as
  unreliable for pointer DnD; use raw `page.mouse`. The two-step move is not decoration — a single
  jump does not start a drag. Drop **onto the target row's box centre**, measured with `boxOf`, not
  onto a computed offset from the source.
- **VALIDATE**: `pnpm --filter @ez-kit/docs test:e2e -- --grep 'row drag'` for both projects.

### Task 12: Changeset

- **ACTION**: Create `.changeset/dnd-row-drag.md`.
- **IMPLEMENT**: `@ez-kit/data-grid-react` minor, `@ez-kit/data-grid-core` minor (the messages
  key), `@ez-kit/data-grid-heroui` minor (the handle block). Summary: the first drag affordance,
  how a call site places the handle (both forms), and that the grid now mounts the adapter's
  provider — which retires the "carried but not driven" caveat from the previous release.
- **MIRROR**: `.changeset/dnd-port.md`.
- **IMPORTS**: n/a.
- **GOTCHA**: **`@ez-kit/data-grid-shadcn` must not appear** even though this phase changes it —
  it is `private` and changesets-ignored, and `scripts/check-changesets.mjs` fails `pnpm lint` on a
  changeset naming it beside a released package.
- **VALIDATE**: `pnpm lint`.

---

## Testing Strategy

### Unit Tests

| Test                          | Input                                | Expected                                       | Edge Case? |
| ----------------------------- | ------------------------------------ | ---------------------------------------------- | ---------- |
| No adapter → no handle        | plain bundle                         | no `row-drag-handle`, DOM identical            | **yes**    |
| Handle renders with a name    | bundle with adapter                  | `data-slot`, `aria-label` from messages        | no         |
| Spec carries the real index   | row at index 3                       | `{ axis: 'row', index: 3, disabled: false }`   | no         |
| Group row is disabled         | grouped grid                         | `disabled: true`                               | **yes**    |
| `ordering.row` off → disabled | `ordering={{ row: false }}`          | `disabled: true`, no handle                    | **yes**    |
| `data-dragging` placement     | adapter reports `isDragging`         | on the `<tr>`, nowhere else                    | no         |
| One commit per drop           | `fireDrop` once                      | `dropRow` once, `onChange` once                | **yes**    |
| Column axis ignored           | `fireDrop({ axis: 'column' })`       | `dropRow` not called                           | **yes**    |
| Keyboard gate                 | `data-dragging` present, `ArrowDown` | tab stop unmoved                               | **yes**    |
| Merged ref                    | row with a `ref` prop                | both the prop and the sortable hold the `<tr>` | **yes**    |
| Registry payload is clean     | built `data-grid.json`               | no `@dnd-kit`                                  | **yes**    |

### Edge Cases Checklist

- [x] No adapter registered
- [x] Row ordering off while an adapter is registered
- [x] A group row (not a record)
- [x] A drop refused by the core helpers (band, parent, sort, grouping — covered by phase 1's tests)
- [x] `Escape` mid-drag
- [x] A drop on the other axis
- [x] Touch drag vs page scroll (`touch-none`)
- [ ] Virtualized rows — **out of scope**, phase 9, and its own spec by PRD decision

---

## Validation Commands

```bash
pnpm --filter @ez-kit/data-grid-react typecheck
pnpm --filter @ez-kit/data-grid-react lint
pnpm --filter @ez-kit/data-grid-react test
pnpm --filter @ez-kit/data-grid-core test
pnpm --filter @ez-kit/data-grid-heroui test && pnpm --filter @ez-kit/data-grid-shadcn test
pnpm build && pnpm lint && pnpm test
pnpm --filter @ez-kit/docs registry:build && grep -c '@dnd-kit' apps/docs/public/r/data-grid.json  # expect 0
pnpm size
pnpm --filter @ez-kit/docs test:e2e -- --grep 'row drag'
```

EXPECT: zero errors throughout; **the kit roots' size numbers unchanged** (the handle block is
reached from `core`, which is a budgeted entry — if `core` grows, say by how much and why, rather
than raising the budget silently).

### Manual Validation

- [ ] Drag a row in both kits in `pnpm docs:dev`; neighbours part during the drag and the order
      commits once on release.
- [ ] `Escape` mid-drag snaps the row back and writes nothing.
- [ ] Tab to the handle, confirm it is the only new tab stop in the row.
- [ ] A docs example **without** DnD is visually unchanged.

---

## Acceptance Criteria

- [ ] A row drags by its handle in both kits and commits once
- [ ] `dragHandle` and `isDragging` reach a call site through render args **and** the provider, and
      `<DataGrid.RowDragHandle />` works inside a cell renderer
- [ ] `data-dragging` on the `<tr>`; `data-slot='row-drag-handle'` on the handle
- [ ] The grid mounts the adapter's `Provider`; the phase-2 M1 caveat is retired
- [ ] The keyboard model stands down mid-drag and leaves `Escape` to dnd-kit
- [ ] A grid with no adapter renders identical DOM
- [ ] `data-grid.json` carries no `@dnd-kit`
- [ ] Changeset names react, core and heroui — never shadcn

## Risks

| Risk                                                              | Likelihood | Impact | Mitigation                                                                                                 |
| ----------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| The merged ref re-attaches every render and breaks a live drag    | M          | H      | Memoise; Task 8 case 10 holds it                                                                           |
| The shadcn adapter reaches the registry payload                   | M          | **H**  | `excludeTopLevel` + a built-JSON assertion in the guard suite, not a manual grep                           |
| Playwright drag is flaky in CI                                    | **H**      | M      | Copy the resizer's exact two-step sequence; measure boxes rather than computing offsets                    |
| heroui's React Aria `Tr` swallows the handle's events or `data-*` | M          | M      | The handle is a `core.Button` inside a cell, not on the `Tr`; heroui's own `data-slot` habit is documented |
| `core` entry size grows past its budget                           | M          | L      | Measured in the validation step; report the delta rather than raising the budget                           |
| The docs example needs a page that does not exist until phase 11  | M          | L      | Check whether `verify-manifest-coverage.mjs` runs in CI before assuming a stub is unnecessary              |

## Notes

### Findings that correct the PRD

- **The shadcn kit _can_ have an adapter now, so "both kits" at phase 4 is achievable.** The PRD
  reads as though shadcn DnD must wait for the phase-10 generator work, and the paragraph
  supporting that is about a nested `blocks/dnd/` directory. A **top-level** `src/dnd.tsx` is
  exactly what `excludeTopLevel` handles (`registry.config.mjs:78` already excludes two files that
  way), and the handle _block_ is payload-safe because it imports the port, not the library. So
  phase 10's remaining scope is shipping the DnD block as its own registry **item** with its own
  dependencies — a delivery question, not a blocker here.
- **`Escape` needs no handler.** The PRD lists "`Escape` cancellation" as phase-4 scope, which
  reads as something to build. dnd-kit cancels on `Escape` itself; the work is making the grid's
  own handler stand down so the key reaches it. Writing a second cancel would double-handle it.
- **One `messages` key lands here, not in phase 8.** Phase 8 owns announcements and the ARIA
  description; a handle with no accessible name is not shippable for four phases in the meantime.

### On the size of this phase

Twelve tasks across five packages is the largest phase in this PRD, and it is Large rather than
Medium mostly because of Tasks 9–11 — the shadcn adapter, the docs plumbing and the spec. A
defensible split is **4a** (Tasks 1–8: the affordance and its unit coverage, heroui-only, no
browser proof) and **4b** (Tasks 9–12: the shadcn adapter, the example and the spec). Phases 5, 6
and 9 depend only on 4a. Recommended only if 4a's review turns up rework; otherwise the two halves
share too much context to be worth the handoff.

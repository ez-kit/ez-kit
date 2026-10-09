# Plan: DnD Phase 5 — Header drag

## Summary

The column axis, end to end. A leaf header cell owns a sortable, publishes a `dragHandle` element
through `DataGridHeaderCellRenderArgs` **and** `HeaderCellProvider`, and
`<DataGrid.ColumnDragHandle />` reads the same thing from a custom cell body. The drop commits once
through `dropColumn` → `table.setColumnOrder(...)`, which closes the `case DragAxis.Column: return`
stub `GridDndProvider` has carried since phase 4. Both kits get the handle block, the `<th>` state
CSS and a `Th` that actually forwards its ref.

Two defects found by measurement while planning are fixed here because phase 5 cannot work with
either of them in place: the adapters never set dnd-kit's `group`, so a grid with both axes would
have killed the optimistic-sorting plugin outright; and the kits' `Th` swallows the ref the
sortable needs, which `ThProps` has declared as required since phase 2.

## User Story

As someone arranging a ten-column pricing table,
I want to drag a column by its header handle,
so that moving it six places is one gesture instead of six menu round-trips.

## Problem → Solution

Phase 4 shipped the row axis and left the column axis a visible stub: `GridDndProvider`'s
`switch (event.axis)` has `case DragAxis.Column: return` with a comment naming this phase, and no
header cell calls `useSortableItem`. `Alt+Arrow` and the column menu remain the only column
affordances, both one step at a time.
→ Leaf header cells register a sortable keyed by column id at their **visual leaf index**, the
handle is a `core.Button` behind a header-cell-scoped context, and the commit is
`table.setColumnOrder(dropColumn(table, sourceId, targetId))` guarded by `canDropColumn`.

## Metadata

- **Complexity**: **Large** — 24 files across five packages.
- **Source PRD**: `.claude/PRPs/prds/data-grid-dnd.prd.md` (revision 3)
- **PRD Phase**: Phase 5 — Header drag
- **Depends on**: Phases 1–4 (`fd8f55dc`, `845ad093`, `cc182615`) — all complete
- **Unblocks**: Phase 7 (needs both column surfaces), Phase 10 (needs the file set final)
- **Runs in parallel with**: Phases 6 and 9 — no shared file. Phase 6 **inherits the index-space
  decision recorded below** and must read it before starting.

---

## UX Design

### Before

```
┌───────────┬───────────┬───────────┬───────────┐
│ Name    ⌄ │ Dept    ⌄ │ Salary  ⌄ │ Region  ⌄ │   ⌄ = column menu → "Move left"
└───────────┴───────────┴───────────┴───────────┘   one step per open-click-close cycle
                                                     Alt+Arrow repeats, still one step
```

### After

```
┌───────────┬───────────┬───────────┬───────────┐
│ ⠿ Name  ⌄ │ ⠿ Dept  ⌄ │ ⠿ Salary⌄ │ ⠿ Region⌄ │   grab the grip in the header
└───────────┴───────────┴───────────┴───────────┘
      ╎ drag ───────────────────────►
┌───────────┬───────────┬───────────┬───────────┐   neighbours part by transform;
│ ⠿ Dept  ⌄ │ ⠿ Salary⌄ │ ⠿ Name  ⌄ │ ⠿ Region⌄ │   nothing committed until release
└───────────┴───────────┴───────────┴───────────┘
      release → one setColumnOrder, one onChange
      a leaf dragged out of its header group → refused, snaps back
```

### Interaction Changes

| Touchpoint                  | Before                                 | After                                                  | Notes                                                       |
| --------------------------- | -------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| Reordering a column         | menu entry / `Alt+Arrow`, one step     | drag by handle, any distance; both old paths unchanged | Fourth affordance, not a replacement                        |
| `<th>` attributes           | `data-movable="true"`                  | + `data-column-dragging="true"` on the drag source     | `data-movable` untouched                                    |
| Header cell render args     | ten members                            | + `dragHandle`                                         | Also published through `HeaderCellProvider`                 |
| The resizer                 | own `mousedown` activator              | unchanged                                              | The drag activator is the handle element only               |
| A grid with no adapter      | —                                      | unchanged, byte for byte                               | The handle renders `null`; the sortable is the port's no-op |
| Grids with **both** axes on | (never existed — phase 4 was row-only) | both work                                              | Requires the `group` fix; see _Findings_                    |

---

## Mandatory Reading

| Priority | File                                                                                                                | Lines                           | Why                                                                                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0**   | `.claude/PRPs/reports/dnd-phase-4-row-drag-report.md`                                                               | all (83)                        | **Read first.** Four root causes, each one an hour. Three of them apply here verbatim: the collection/context reachability question, `targetIndex` not `targetId`, and the RAC attribute collision.                                                                             |
| **P0**   | `packages/data-grid/react/react/src/data-grid/header-cell.tsx`                                                      | all (470)                       | The file this phase changes most: the selection-column **early return** (`:170-210`), `canMove` (`:247`), `onHeaderKeyDown` and its RTL term (`:249-275`), the args object (`:432-443`), the single `<Th>` return (`:445-469`).                                                 |
| **P0**   | `packages/data-grid/react/react/src/data-grid/row.tsx`                                                              | `:220-270`                      | The mirror: unconditional `useSortableItem`, `drag` derived from `isDraggable` rather than read raw, the memoised `mergeRefs`, `data-row-dragging`.                                                                                                                             |
| **P0**   | `packages/data-grid/react/react/src/data-grid/row-drag-registry.tsx`                                                | all (108)                       | **Why the header does NOT need this.** Its docblock states the constraint precisely; Task 1 measures whether it holds for headers before anything is built on the answer.                                                                                                       |
| **P0**   | `packages/data-grid/react/react/src/data-grid/dnd/types.ts`                                                         | all                             | `DragSpec` (esp. `index`), `SortableItemHandle`, `DndDropEvent`'s `targetIndex` docblock, `DndAdapter`.                                                                                                                                                                         |
| **P0**   | `packages/data-grid/core/src/features/ordering/drop.ts`                                                             | `:37-150`                       | `canDropColumn` / `dropColumn`: **plain functions on core's root entry, not methods on `table.ordering`** — unlike `dropRow`. `dropColumn` returns a whole `ColumnOrderState`; a refusal returns the current order unchanged, which is why `canDropColumn` must be asked first. |
| **P0**   | `packages/data-grid/react/react/src/data-grid/data-grid.tsx`                                                        | `:309-345`                      | `GridDndProvider` and the `case DragAxis.Column: return` stub this phase replaces.                                                                                                                                                                                              |
| **P0**   | `packages/data-grid/react/react/src/utils/visual-column-order.ts`                                                   | all (33)                        | `getVisualLeafColumns` — the index space. Its docblock says why `getVisibleLeafColumns()` is the wrong list whenever _order_ matters.                                                                                                                                           |
| **P0**   | `packages/data-grid/react/react/src/types.ts`                                                                       | `:326-339`                      | `ThProps` **already** declares `RefAttributes<HTMLTableCellElement>` with a docblock naming this exact use, and warns that a kit which swallows it typechecks and silently never attaches. Both kits currently swallow it.                                                      |
| P1       | `packages/data-grid/react/heroui/src/blocks/core/table-adapters.tsx`                                                | `Thead`, `Tr`, `Th`             | `Th` → `HeroTable.Column` (a React Aria collection leaf); the header `Tr` renders a **fragment**; grouped header rows are dropped in this kit (`warnGroupedHeadersUnsupported`).                                                                                                |
| P1       | `packages/data-grid/react/shadcn/src/blocks/core/Th.tsx` + `src/components/ui/table.tsx`                            | all / `:26-102`                 | shadcn's `Th` and the vendored `TableHead`. `TableHeader` and `TableRow` in that vendored file **already carry `forwardRef` with a comment naming the reason** — the precedent for Task 6.                                                                                      |
| P1       | `packages/data-grid/react/react/src/data-grid/row-drag-handle.tsx`                                                  | all (85)                        | The handle to mirror: `core.Button`, authored `data-slot`, `aria-label` from `messages`, `return null` when there is no drag.                                                                                                                                                   |
| P1       | `packages/data-grid/react/react/src/data-grid/composition-context.tsx`                                              | `:50-120`                       | `HeaderCellProvider` / `useDataGridHeaderCell`, and the note that the **selection column has no header-cell context**.                                                                                                                                                          |
| P1       | `packages/data-grid/react/{heroui,shadcn}/src/blocks/ordering/RowDragHandle.tsx`                                    | all                             | The kit block to mirror, glyph and Tailwind classes included (`cursor-grab`, `touch-none`, `active:cursor-grabbing`).                                                                                                                                                           |
| P1       | `packages/data-grid/react/{heroui,shadcn}/src/styles.css`                                                           | the `[data-row-dragging]` block | The state CSS to mirror, and the only place a kit says what dragging looks like.                                                                                                                                                                                                |
| P1       | `apps/docs/e2e/packages/data-grid/ordering/row-drag.spec.ts`                                                        | all (110)                       | The drag spec to mirror: raw `page.mouse` in steps, `.first()` on the locator, and the corrected mid-drag invariant (**committed state**, not DOM order).                                                                                                                       |
| P1       | `apps/docs/e2e/packages/data-grid/pinning/rtl-columns.spec.ts`                                                      | `:1-45`                         | The RTL precedent: a `dir='rtl'` wrapper **plus** `direction='rtl'` on the grid, assertions written as _relations_ so they fail on an LTR layout instead of passing on one.                                                                                                     |
| P1       | `apps/docs/shared/data-grid/examples/components/row-drag.tsx` + `shared/DataGridDnd.tsx` + `shared/data-grid-dnd/*` | all                             | All the docs DnD plumbing already exists. This phase adds examples and one handle switcher entry — no new infrastructure.                                                                                                                                                       |
| P2       | `packages/data-grid/react/{heroui,shadcn}/src/dnd.tsx`                                                              | `useSortableItem`               | Where `group` is added. The two files differ by **one word** in a docblock; keep them that way.                                                                                                                                                                                 |
| P2       | `apps/docs/e2e/fixtures.ts`                                                                                         | `:59-85`                        | `grid.header(columnId)` → `[data-slot="th"][data-column-id="…"]`, `columnIndex`, `boxOf`.                                                                                                                                                                                       |
| P2       | `scripts/generate-shadcn-registry-manifest.mjs`                                                                     | `:140-170`                      | `registry.json` is **generated**; a new file under `blocks/` is picked up with no hand edit.                                                                                                                                                                                    |

## External Documentation

| Topic                      | Source                                                        | Key Takeaway                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OptimisticSortingPlugin`  | `@dnd-kit/dom@0.1.21/sortable.js` (read, not inferred)        | Indices must be **dense `0..n-1` within a `group`**, or the plugin bails and nothing commits. See the three insights.                                                  |
| `Sortable` options         | same file, the `Sortable2` constructor                        | `group` is a first-class option beside `index` / `type`. `useSortable` forwards it (`@dnd-kit/react/sortable.js:62`).                                                  |
| Registration vs `disabled` | `@dnd-kit/react/index.js:182-191`                             | `useIsomorphicLayoutEffect(instance.register)` runs regardless of `disabled` — a disabled sortable still occupies an index.                                            |
| React Aria `Column` attrs  | `react-aria-components@1.21.1/dist/private/Table.mjs:743-754` | The column header's own set is `data-hovered / pressed / focused / focus-visible / resizing / allows-sorting / sort-direction`. **`data-dragging` is not among them.** |

```
KEY_INSIGHT: `OptimisticSortingPlugin` sorts each group's instances by index and then asserts
             `sortable.index === i` for every position. One gap, one duplicate, and it returns
             early — so there is no visual displacement AND `source.index` is never updated,
             which makes `toDropEvent` see `index === initialIndex` and refuse the drop.
APPLIES_TO:  Task 3 (which header cells register), Task 5 (`group`), Task 4 (resolution).
GOTCHA:      This is a *silent* failure mode: the drag starts, the handle works, nothing moves,
             nothing commits. It looks like a missing commit, not like a bad index.
```

```
KEY_INSIGHT: `group` is never set by either adapter today, so every sortable in a grid lands in
             the same `undefined` group. With rows at 0..7 and columns at 0..4 the density
             assertion above fails at the second position and BOTH axes stop working.
APPLIES_TO:  Task 5 — both kits' `dnd.tsx`.
GOTCHA:      `type` / `accept` already keep the two axes from *colliding*, which is why this was
             invisible in phase 4 and why it will not be caught by a row-only test. It is the
             group, not the type, that partitions the index space.
```

```
KEY_INSIGHT: React Aria's `Column` does NOT write `data-dragging` (seven attributes, listed
             above). So the phase-4 collision does not repeat for the header.
APPLIES_TO:  Task 3 — the attribute name.
GOTCHA:      Do not record `data-column-dragging` as a collision fix. It is a **consistency**
             choice with `data-row-dragging` and with the `data-row-*` / `data-column-*`
             namespace the repo already uses (`data-column-id`). Say that, not the other thing.
```

---

## Patterns to Mirror

### HEADER_CELL_ARGS_PLUS_PROVIDER

```tsx
// SOURCE: src/data-grid/header-cell.tsx:432-469 — built once, handed to a render function AND published
const args: DataGridHeaderCellRenderArgs<TRow> = { header, column: header.column, canSort, …, resizer }
const content = children === undefined ? defaultContent : typeof children === 'function' ? children(args) : children

return (
	<Th {...navigationProps} data-slot='th' data-column-id={header.column.id} …>
		<HeaderCellProvider value={args}>
			{content}
			{resizer}
		</HeaderCellProvider>
	</Th>
)
```

### DRAG_STATE_IS_DERIVED_NOT_RAW

```tsx
// SOURCE: src/data-grid/row.tsx:243-246 — the attribute comes from the gated value, never the hook
const drag: RowDragValue | null = isDraggable
	? { handleRef: sortable.handleRef, isDragging: sortable.isDragging }
	: null
// …
{...(drag?.isDragging ? { 'data-row-dragging': 'true' } : {})}
```

### HANDLE_COMPONENT

```tsx
// SOURCE: src/data-grid/row-drag-handle.tsx:62-85
export function RowDragHandle({ children, 'aria-label': ariaLabel, rowId }: DataGridRowDragHandleProps = {}) {
	const drag = useRowDrag(rowId ?? cell)
	const { Button } = useGridComponents().core
	const messages = useGridMessages()
	if (!drag) return null
	return (
		<Button
			ref={drag.handleRef}
			type='button'
			data-slot='row-drag-handle'
			aria-label={ariaLabel ?? messages.ordering.dragRow}
		>
			{children}
		</Button>
	)
}
```

### KIT_HANDLE_BLOCK

```tsx
// SOURCE: packages/data-grid/react/shadcn/src/blocks/ordering/RowDragHandle.tsx
export function RowDragHandle({ children, ...props }: DataGridRowDragHandleProps) {
	return (
		<DataGridRowDragHandle {...props}>
			{children ?? (
				<GripVertical
					aria-hidden='true'
					className='size-4 cursor-grab touch-none select-none active:cursor-grabbing'
				/>
			)}
		</DataGridRowDragHandle>
	)
}
```

### VENDORED_FORWARD_REF_PRECEDENT

```tsx
// SOURCE: packages/data-grid/react/shadcn/src/components/ui/table.tsx:62-66
// `forwardRef` for the same reason as {@link TableHeader}: pinned rows are measured through it.
const TableRow = React.forwardRef<HTMLTableRowElement, React.ComponentProps<'tr'>>(function TableRow(
	{ className, style, ...props }, ref,
) {
```

### COLUMN_COMMIT

```tsx
// SOURCE: src/data-grid/header-cell.tsx:273-274 — the existing column-order commit, Alt+Arrow
if (!canMoveColumn(table, header.column.id, direction)) return
table.setColumnOrder(moveColumn(table, header.column.id, direction))
```

### KIT_STATE_CSS

```css
/* SOURCE: packages/data-grid/react/shadcn/src/styles.css:491-500 */
/*
 * A row being dragged.
 * The drag library moves the element with its own transform; what is left for a kit is saying …
 */
[data-slot='tr'][data-row-dragging] {
	/* … */
}
```

### E2E_DRAG

```ts
// SOURCE: apps/docs/e2e/packages/data-grid/ordering/row-drag.spec.ts:44-59
const handle = await boxOf(handleIn(rowById(page, sourceId)))
const target = await boxOf(rowById(page, targetId))
await page.mouse.move(from.x, from.y)
await page.mouse.down()
await page.mouse.move(from.x, from.y + (to.y - from.y) / 2, { steps: 4 })
await page.mouse.move(to.x, to.y, { steps: 4 })
if (midDrag) await midDrag()
await page.mouse.up()
```

---

## Files to Change

| File                                                               | Action | Justification                                                                |
| ------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| `…/react/react/src/data-grid/column-drag.tsx`                      | CREATE | `ColumnDragShell` (owns the sortable + the `<th>`), context, `useColumnDrag` |
| `…/react/react/src/data-grid/column-drag-handle.tsx`               | CREATE | `<DataGrid.ColumnDragHandle />`                                              |
| `…/react/react/src/data-grid/header-cell.tsx`                      | UPDATE | Routes both `<th>` branches through the shell; `dragHandle` in the args      |
| `…/react/react/src/data-grid/data-grid.tsx`                        | UPDATE | The column commit; the compound member                                       |
| `…/react/react/src/data-grid/dnd/types.ts`                         | UPDATE | `DragSpec.index` gains the density requirement (measured)                    |
| `…/react/react/src/index.ts` + `kit.ts`                            | UPDATE | Export the component, its props type, `useColumnDrag`, `ColumnDragValue`     |
| `…/react/react/src/data-grid/column-drag.test.tsx`                 | CREATE | Unit coverage: registration set, index, commit, attribute, gate              |
| `…/core/src/messages/{types,defaults}.ts`                          | UPDATE | `ordering.dragColumn`                                                        |
| `…/react/heroui/src/blocks/core/table-adapters.tsx`                | UPDATE | `Th` must `forwardRef` to `HeroTable.Column`                                 |
| `…/react/shadcn/src/blocks/core/Th.tsx`                            | UPDATE | `Th` must `forwardRef`                                                       |
| `…/react/shadcn/src/components/ui/table.tsx`                       | UPDATE | Vendored `TableHead` gains `forwardRef` — **registry payload**; see Task 6   |
| `…/react/{heroui,shadcn}/src/blocks/ordering/ColumnDragHandle.tsx` | CREATE | The kits' handle visual                                                      |
| `…/react/{heroui,shadcn}/src/index.ts`                             | UPDATE | Export it                                                                    |
| `…/react/{heroui,shadcn}/src/styles.css`                           | UPDATE | `[data-slot='th'][data-column-dragging]`                                     |
| `…/react/{heroui,shadcn}/src/dnd.tsx`                              | UPDATE | `group: spec.axis` — the density partition                                   |
| `…/react/{heroui,shadcn}/src/dnd.test.ts(x)`                       | UPDATE | Assert the spec handed to `useSortable` carries `group`                      |
| `apps/docs/shared/data-grid-dnd/handle.tsx`                        | UPDATE | A `ColumnDragHandle` switcher beside the row one                             |
| `apps/docs/shared/data-grid/examples/components/column-drag.tsx`   | CREATE | Two exports: the LTR example and the RTL one                                 |
| `apps/docs/shared/data-grid/examples/{manifest.json,registry.ts}`  | UPDATE | Register both ids (one `sourceFile`, two `exportName`s)                      |
| `apps/docs/e2e/packages/data-grid/ordering/column-drag.spec.ts`    | CREATE | The browser proof, both kits                                                 |
| `.changeset/dnd-header-drag.md`                                    | CREATE | `data-grid-react`, `data-grid-core`, `data-grid-heroui`                      |

## NOT Building

- **No visibility-panel drag** (phase 6), **no virtualized column drag** (phase 9 is rows; column
  virtualization is a PRD `Won't`).
- **No keyboard or touch sensor configuration** (phase 7). The keyboard gate phase 4 built is
  attribute-driven and already covers this surface — see Task 3's note on `DRAGGING_ATTR`.
- **No announcements, live region, `aria-roledescription` or `aria-describedby`** (phase 8). One
  `messages` key for the handle's accessible name, exactly as phase 4 took one.
- **No `isDragging` in `DataGridHeaderCellRenderArgs`.** The PRD's scope line for this phase names
  `dragHandle` only; `useColumnDrag()` is the public read for the boolean. See _Notes_ for why this
  is asymmetric with the row and why that asymmetry is the honest shape.
- **No mid-drag refusal affordance.** A leaf dragged out of its header group is refused on release
  and snaps back — PRD Could-tier.
- **No fix for the row axis' index space under pagination or tree rows.** Found while planning,
  recorded in _Findings_, out of scope.
- **No shadcn registry item for the DnD block** (phase 10) and **no docs page** (phase 11).
- **No placement option, no system column for the handle.** The PRD forbids both.

---

## Step-by-Step Tasks

### Task 1: Probe — is a header-cell-level context reachable from where the handle renders?

- **ACTION**: Before writing anything, answer the question phase 4 got wrong twice. Write a
  throwaway test in the **heroui** kit (`packages/data-grid/react/heroui/src/`) that renders a grid
  with a `<DataGrid.HeaderCell>` render function whose body is a component calling
  `useDataGridHeaderCell()`, and assert it does not throw and returns the args.
- **IMPLEMENT**: Read the result, then delete the probe. Record the answer in the implementation
  report either way.
- **MIRROR**: the phase-4 report's "Measured from inside a cell renderer" paragraph — same method.
- **GOTCHA**: The **expected** answer is "reachable", and the reading behind that expectation is:
  heroui's `Th` renders `HeroTable.Column` and passes `HeaderCellProvider` **as its children**, so
  provider and consumer are one collection node — unlike the row case, where the provider was in
  `Tr` and the consumer in a separate `Cell` node. **Do not take the reading for the measurement.**
  If it is unreachable, stop and escalate: the fallback is a table-level registry keyed by column
  id, mirroring `row-drag-registry.tsx`, and it changes Tasks 2 and 3 substantially.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-heroui test`.

### Task 2: `column-drag.tsx` — the shell, the context, the hook

- **ACTION**: Create `…/react/react/src/data-grid/column-drag.tsx`.
- **IMPLEMENT**:
  - `export type ColumnDragValue = Pick<SortableItemHandle, 'handleRef' | 'isDragging'>` — the same
    shape as `RowDragValue`, declared again rather than renaming a published type.
  - A module-scope `ColumnDragContext` (all 12 existing `createContext` calls are at module scope)
    and `export function useColumnDrag(): ColumnDragValue | null`.
  - `export function ColumnDragShell({ columnId, index, disabled, thProps, children })`:
    calls `useSortableItem({ id: columnId, index, axis: DragAxis.Column, disabled })`
    **unconditionally**, derives `drag = disabled ? null : { handleRef, isDragging }`, and renders
    the kit's `Th` with `{...thProps}`, `ref={sortable.ref}`,
    `{...(drag?.isDragging ? { 'data-column-dragging': 'true' } : {})}`, wrapping `children` in the
    provider.
  - A docblock carrying **the three load-bearing facts**: (a) why the sortable lives here and not
    in `DataGridHeaderCell` — non-leaf and placeholder headers must not register, and a hook cannot
    be skipped, so participation is a _component_ decision; (b) the density requirement, quoted
    from the measurement, with the file and symbol it was read from; (c) that the attribute is
    `data-column-dragging` for namespace consistency and **not** because React Aria's `Column`
    writes `data-dragging` — it does not, and the seven it does write are listed.
- **MIRROR**: DRAG_STATE_IS_DERIVED_NOT_RAW; `row-drag-registry.tsx` for docblock register.
- **IMPORTS**: `useSortableItem`, `DragAxis` from `./dnd`; `useGridComponents` from
  `../components-context`; `type ThProps`, `type SortableItemHandle`.
- **GOTCHA**: The `ref` is **not** merged here — `Th` has no other consumer of its ref in this
  package (unlike `Tr`, which carries the pinning measurement), so `mergeRefs` is not needed and
  adding it would invent a problem. If a later phase gives the `<th>` a second ref, memoise then,
  and re-read `mergeRefs`' docblock for why.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react typecheck`.

### Task 3: `header-cell.tsx` — route both `<th>` branches through the shell

- **ACTION**: Update `…/react/react/src/data-grid/header-cell.tsx`.
- **IMPLEMENT**, in this order:
  1. Add `const isDndEnabled = useDndEnabled()` **at the top**, beside the other hooks and above
     every early return.
  2. Move `const canMove = …` (currently `:247`) **above the selection-column early return**. It
     reads only `table.grid.ordering.column`, `meta` and `header.isPlaceholder`, all available
     there. Leave the existing comment with it.
  3. Compute participation and the index:
     ```ts
     // Only the bottom header row's real leaf headers take part: a group header has sub-headers
     // and a placeholder stands in for a leaf that renders elsewhere, so neither is a member of
     // the leaf order the index counts in — and an item registered outside that order breaks its
     // density, which silently kills the whole drag. See `column-drag.tsx`.
     const isLeafHeader = header.subHeaders.length === 0 && !header.isPlaceholder
     const visualIndex = isLeafHeader
     	? getVisualLeafColumns(table).findIndex((column) => column.id === header.column.id)
     	: -1
     const isDragParticipant = visualIndex >= 0
     ```
  4. A local `renderTh(thProps, inner)` closure that returns
     `isDragParticipant ? <ColumnDragShell columnId={header.column.id} index={visualIndex} disabled={!isDndEnabled || !canMove} thProps={thProps}>{inner}</ColumnDragShell> : <Th {...thProps}>{inner}</Th>`.
  5. Rewrite **both** returns — the selection branch and the main one — to build their `<th>` props
     as an object and hand it to `renderTh`. The selection column is a visible leaf, so it
     **participates** (disabled, since a system column is never `isMovable`) — that is what keeps
     the index space dense.
  6. Add `dragHandle: ReactNode` to `DataGridHeaderCellRenderArgs` with a docblock mirroring the
     row's, and set it in the args object to
     `isDragParticipant && isDndEnabled && canMove ? <ColumnDragHandle /> : null`. It takes no
     props: the context is always directly above it, because the handle renders inside the `<th>`
     the shell owns.
- **MIRROR**: HEADER_CELL_ARGS_PLUS_PROVIDER, DRAG_STATE_IS_DERIVED_NOT_RAW.
- **IMPORTS**: `getVisualLeafColumns` from `../utils/visual-column-order`; `ColumnDragShell` from
  `./column-drag`; `ColumnDragHandle` from `./column-drag-handle`; `useDndEnabled` from `./dnd`.
- **GOTCHA**: Five, all load-bearing.
  1. **The selection branch must participate.** Skipping it leaves a hole at index 0 in every grid
     with a selection column, which is most of them, and the failure is silent.
  2. **`findIndex` returning `-1`** means the header cell was rendered for a column the visual leaf
     list does not contain — a custom `<DataGrid.Header>` rendering a hidden column, say. Fall back
     to the plain `Th`; do not pass a negative index.
  3. **A custom `<DataGrid.Header>` that renders only _some_ header cells breaks density.** Nothing
     can detect that from inside a cell. State the limitation in `ColumnDragShell`'s docblock; do
     not attempt a runtime check.
  4. **No `data-column-dragging` on the args, and no `isDragging` member.** See _NOT Building_.
  5. **`onHeaderKeyDown` stays exactly as it is.** `Alt+Arrow` is a separate affordance, the RTL
     term in it is already correct and tested, and the keyboard gate phase 4 built is keyed on a
     DOM attribute — but note that gate's constant is `data-row-dragging`; check whether it needs
     to cover `data-column-dragging` too (it reads `root.querySelector('[data-row-dragging]')`).
     If it does, widen the selector to both attributes in one place and say why.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react test` — `header-cell.test.tsx`,
  `data-attrs.test.tsx`, `header-slots.test.tsx`, `accessible-names.test.tsx` and
  `feature-optionality.test.tsx` must all stay green **untouched**.

### Task 4: The commit — `case DragAxis.Column`

- **ACTION**: Update `GridDndProvider` in `…/react/react/src/data-grid/data-grid.tsx`.
- **IMPLEMENT**: Replace `case DragAxis.Column: return` with:
  ```ts
  case DragAxis.Column: {
    // The adapter reports where the item landed; the column living at that index in the
    // **visual** leaf order is the target `dropColumn` wants — the same order the header
    // registered its items in, which is the only way the two agree.
    const target = getVisualLeafColumns(table)[event.targetIndex]
    if (!target || target.id === event.sourceId) return
    // Asked before committing, because `dropColumn` answers a refusal with the current order,
    // which is indistinguishable from a legal drop that changed nothing — so an unguarded call
    // would fire `onChange` on a refused drop. `drop.ts` says so in full.
    if (!canDropColumn(table, event.sourceId, target.id)) return
    table.setColumnOrder(dropColumn(table, event.sourceId, target.id))
    return
  }
  ```
  Delete the "arrives once header dragging exists" paragraph above the switch and replace it with
  one sentence saying the two axes commit through different calls and why.
- **MIRROR**: COLUMN_COMMIT (the `Alt+Arrow` pair, `canMoveColumn` then `moveColumn`), and the
  `DragAxis.Row` arm directly above.
- **IMPORTS**: `canDropColumn`, `dropColumn` from `@ez-kit/data-grid-core`; `getVisualLeafColumns`
  from `../utils/visual-column-order`.
- **GOTCHA**: `ColumnMoveScope.Visible` is `dropColumn`'s default and is the right scope for the
  header — a hidden column renders no header cell, so it cannot be either end here. Phase 6 passes
  `ColumnMoveScope.All` **and has its own index space**; do not generalise this arm for it now.
- **VALIDATE**: Task 8's commit cases.

### Task 5: `group` — partition the index space per axis

- **ACTION**: Update `…/react/{heroui,shadcn}/src/dnd.tsx` (identically) and their tests.
- **IMPLEMENT**: In `useSortableItem`, add `group: spec.axis` beside `type` / `accept`, with a
  comment: `type` / `accept` keep the two axes from colliding, and `group` keeps them out of each
  other's **index space** — `OptimisticSortingPlugin` asserts each group's indices are exactly
  `0..n-1`, so rows at `0..7` and columns at `0..4` in one group fail that assertion at the second
  position and **both** axes stop displacing and stop committing. Name the file and symbol the
  measurement came from.
- **MIRROR**: the existing `type` / `accept` comment two lines above it.
- **GOTCHA**: **This is not the composite `group` key the PRD removed in r3.** That one encoded pin
  band plus `parentId` to enforce boundaries mid-drag; this is the axis, nothing more, and
  boundaries are still refused at the commit. Say so in the comment, or the next reviewer will read
  it as a re-proposal of a rejected design.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-heroui test && pnpm --filter @ez-kit/data-grid-shadcn test`.

### Task 6: `Th` must forward its ref — both kits, and the vendored primitive

- **ACTION**: Update heroui's `blocks/core/table-adapters.tsx`, shadcn's `blocks/core/Th.tsx`, and
  shadcn's vendored `components/ui/table.tsx`.
- **IMPLEMENT**: `forwardRef<HTMLTableCellElement, ThProps>` on each kit's `Th`, landing the ref on
  `HeroTable.Column` and on `TableHead` respectively; `forwardRef` on the vendored `TableHead`,
  landing it on the `<th>`.
- **MIRROR**: VENDORED_FORWARD_REF_PRECEDENT — `TableHeader` and `TableRow` in that same vendored
  file already do exactly this, each with a one-line comment naming the reason. Write the third in
  the same voice: _"`forwardRef` for the same reason as {@link TableRow}: a header is the element a
  pointer drag moves, and a drag library is handed the node through a ref."_
- **GOTCHA**: Three.
  1. **`forwardRef`, not a `ref` prop.** This package supports React 18, where `ref` never reaches
     a function component's props — the reason `Thead` and `Tr` are already `forwardRef` in both
     kits. On React 19 the current spread happens to work, which is exactly why this was invisible.
  2. **The vendored file is the shadcn registry payload.** AGENTS.md: a casual edit propagates to
     every `npx shadcn add`. This edit is not casual and follows the two edits already in the file,
     but it must be named in the changeset's prose and the comment must say why.
  3. `ThProps` already declares `RefAttributes` — **do not widen the type**, it has been right
     since phase 2 and the kits were wrong.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-shadcn test && pnpm --filter @ez-kit/data-grid-heroui test`;
  `pnpm --filter @ez-kit/data-grid-react test:react18` (the React 18 config exists for this class
  of defect); then `pnpm --filter @ez-kit/docs registry:build` and confirm the payload's
  `table.tsx` carries the new `forwardRef`.

### Task 7: The messages key

- **ACTION**: Update `…/core/src/messages/{types,defaults}.ts`.
- **IMPLEMENT**: `ordering.dragColumn: string`, default `'Reorder column'`, beside `dragRow`.
- **MIRROR**: the `ordering` group's existing docblock, which already says this group is where the
  drag's remaining strings land as the surfaces arrive. Nothing about that paragraph needs changing
  — this is the case it anticipated.
- **GOTCHA**: Still not preempting phase 8, for the reason `dragRow`'s note gives. Do not restate
  the whole argument; one sentence pointing at `dragRow` is enough.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-core test`.

### Task 8: Unit tests

- **ACTION**: Create `…/react/react/src/data-grid/column-drag.test.tsx`.
- **IMPLEMENT**, using phase 4's test adapter double (it already captures `onDrop` and exposes
  `fireDrop`, and records every spec it was handed):
  1. No adapter → no `[data-slot="column-drag-handle"]`, no `data-column-dragging`, and the header
     markup is identical to a grid rendered without the DnD providers.
  2. With an adapter → the handle renders from a render function **and** from a component calling
     `useDataGridHeaderCell()`; `data-slot` and the accessible name from `messages` are right.
  3. **The registration set and its density**: a grid with a selection column, an actions column,
     one `ordering: false` column and four ordinary ones registers **one sortable per visible leaf
     column**, with `axis: 'column'` and indices exactly `0..n-1` — asserted as
     `expect(specs.map(s => s.index).sort((a,b)=>a-b)).toEqual([...Array(n).keys()])`, which is the
     assertion that fails if any branch is skipped.
  4. The same over a **grouped** header (`columns[].columns`): group headers and placeholders
     register **nothing**, and the leaf set is still dense.
  5. `disabled: true` for the selection column, the actions column, the `ordering: false` column,
     and for every column when `ordering.column` is off; `false` for the rest.
  6. The index follows **visual** order, not declaration order: pin a middle column `start` and
     assert its index is `0`.
  7. `isDragging` from the adapter puts `data-column-dragging="true"` on that `<th>` and nowhere
     else — including a grid with `ordering.column` off, which is the phase-4 regression that the
     derived-not-raw rule exists for.
  8. `fireDrop({ axis: 'column', sourceId, targetIndex })` calls `setColumnOrder` **once** with the
     order `dropColumn` produces, and `onChange` fires exactly once.
  9. A **refused** drop — a leaf dragged past its header group's boundary — calls neither
     `setColumnOrder` nor `onChange`. This is the PRD's success criterion for the phase, and the
     first time `dropColumn` is exercised on a real boundary from the React layer.
  10. A drop on the **row** axis does not touch the column order.
  11. The `<th>` receives the sortable's ref: assert through the test adapter that the node handed
      to `ref` is the `<th>` carrying the column's `data-column-id`. **This is the case that would
      have caught Task 6**; write it so it fails without that task.
- **MIRROR**: `row-drag.test.tsx` for the harness and the adapter double; `renderGrid` /
  `testComponents` from `test-utils.tsx`.
- **GOTCHA**: jsdom reports every element as zero-sized, so no gesture can be exercised here.
  Everything above is about the **spec handed to the adapter** and the **commit triggered from it** —
  the two boundaries that are observable without layout. The gesture itself is Task 12's job, and
  the refusal logic proper is already covered by phase 1's core tests.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react test`.

### Task 9: The handle component and its exports

- **ACTION**: Create `…/react/react/src/data-grid/column-drag-handle.tsx`; update `index.ts`,
  `kit.ts` and the compound namespace in `data-grid.tsx`.
- **IMPLEMENT**:
  - `DataGridColumnDragHandleProps = { children?: ReactNode; 'aria-label'?: string }` — **no
    `columnId`**, unlike the row's. Docblock says why: the handle always renders inside the `<th>`
    whose shell provides the context, so there is nothing to look up. The row needed an id because
    a cell renderer sits outside the row's subtree in the heroui kit; a header cell's body does not.
  - The component itself, mirroring HANDLE_COMPONENT with `data-slot='column-drag-handle'` and
    `messages.ordering.dragColumn`.
  - Exports: `ColumnDragHandle as DataGridColumnDragHandle`, `type DataGridColumnDragHandleProps`,
    `useColumnDrag`, `type ColumnDragValue`; `ColumnDragHandle` added to the compound.
- **MIRROR**: `row-drag-handle.tsx` and the three export sites it touched (`index.ts:163,252,269`).
- **GOTCHA**: The compound is assembled by **one `/* @__PURE__ */ Object.assign` with a flat object
  literal** (AGENTS.md states this at length). Add the member to that literal. Do **not** add a
  property assignment and do **not** spread a group in — either silently restores the tree-shaking
  defect, and `apps/docs/test/tree-shaking.test.ts` fails on both. Add the named export beside the
  compound key, as every other member has.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react test` including `compound-slots.test.tsx` and
  `compound-composition.test.tsx`; `pnpm --filter @ez-kit/docs test -- tree-shaking`.

### Task 10: The kit blocks and the state CSS

- **ACTION**: Create `blocks/ordering/ColumnDragHandle.tsx` in each kit, export it, and add the
  `<th>` dragging rule to each `styles.css`.
- **IMPLEMENT**: A near-copy of each kit's `RowDragHandle.tsx` — `GripVertical` from `lucide-react`,
  the same `cursor-grab touch-none select-none active:cursor-grabbing` classes, wrapping
  `DataGridColumnDragHandle`. In each `styles.css`, a `[data-slot='th'][data-column-dragging]` rule
  beside the existing `[data-slot='tr'][data-row-dragging]` one, using that kit's own tokens.
- **MIRROR**: KIT_HANDLE_BLOCK, KIT_STATE_CSS.
- **GOTCHA**: Two.
  1. `GripVertical` is the row's glyph. A column drags along the inline axis, so
     `GripHorizontal` reads correctly there — both are already in `lucide-react`, which both kits
     depend on. Use `GripHorizontal` and say so in the block's docblock; do not "unify" with the
     row.
  2. `touch-none` is not decoration — without it a touch drag scrolls the page. Keep each kit's own
     spelling of the touch utility rather than unifying; that difference predates this phase.
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-shadcn test && pnpm --filter @ez-kit/data-grid-heroui test`;
  `pnpm --filter @ez-kit/docs registry:build` and confirm the new block is in the payload and no
  `@dnd-kit` string is.

### Task 11: The docs examples

- **ACTION**: Update `apps/docs/shared/data-grid-dnd/handle.tsx`; create
  `apps/docs/shared/data-grid/examples/components/column-drag.tsx`; register two ids.
- **IMPLEMENT**:
  - `handle.tsx` gains a `ColumnDragHandle` switcher beside `RowDragHandle`, same two `lazy`
    imports, same shape.
  - `column-drag.tsx` exports **two** components from one file:
    - `ColumnDragExample` — `ordering={{ column: true }}`, a `<DataGrid.HeaderCell>` render
      function placing `dragHandle` beside `sortTrigger` and `menu`, a `data-testid` commit counter
      the spec reads (mirroring `row-drag-commits`), one column with `ordering: false` and one
      **header group** so the spec can test the boundary.
    - `ColumnDragRtlExample` — the same grid inside `<div dir='rtl'>` with `direction='rtl'`.
  - Register both in `manifest.json` (two ids, one `sourceFile`, two `exportName`s) **and** the
    single `sourceFile` in `registry.ts`.
- **MIRROR**: `row-drag.tsx` for the example; `pinning/rtl-columns.tsx` for the RTL wrapper;
  `filter-chips.tsx` for two exports from one file.
- **GOTCHA**: Three.
  1. **Missing the `registry.ts` entry throws only at render** — lint, typecheck and build all
     pass. AGENTS.md says so; phase 4's plan flagged it; do not skip it.
  2. `ordering.column` takes the scalar-or-object form. The commit counter needs the object form
     with `onChange`; check `ColumnOrderingConfig` for the callback's exact signature (it is a
     whole `ColumnOrderState`, not a move) rather than assuming the row's shape.
  3. `scripts/verify-manifest-coverage.mjs` asserts every manifest example is referenced from some
     `.mdx`. It is documented as run manually — **verify whether it runs in CI** before assuming
     these two examples can go pageless until phase 11; phase 4 left the same question open.
- **VALIDATE**: `pnpm docs:dev`; open `/examples/heroui/column-drag`, `/examples/shadcn/column-drag`
  and both RTL routes, and drag a column by hand in each.

### Task 12: The browser spec

- **ACTION**: Create `apps/docs/e2e/packages/data-grid/ordering/column-drag.spec.ts`.
- **IMPLEMENT**, all through the `grid` fixture so the project matrix runs each case per kit:
  1. Dragging a column three places reorders the `data-column-id` sequence, and the commit counter
     reads `1`.
  2. Mid-drag, `data-column-dragging="true"` is on the source `<th>` and the counter still reads
     `0`. **Do not assert the DOM order is unchanged** — the library displaces optimistically; the
     committed state is the invariant. Phase 4's spec carries this correction in a comment; copy it.
  3. `Escape` mid-drag leaves the order untouched and the counter at `0`.
  4. **A leaf cannot leave its header group**: dragging a grouped leaf onto a column in another
     group leaves the order untouched and the counter at `0`. _(shadcn only — heroui drops group
     header rows entirely, `warnGroupedHeadersUnsupported`. Gate it on the project and say why.)_
  5. **The resizer still resizes**: perform the resizing spec's drag on a resizable column's
     resizer and assert the width changed and the order did not.
  6. **RTL**: on `column-drag-rtl`, dragging a column toward the inline end lands it there. Stated
     as a **relation** between two columns' boxes and their `data-column-id` order, so an LTR
     implementation fails it rather than satisfying it — the rule `rtl-columns.spec.ts` sets.
  7. A grid with `ordering.column` off renders no handle. _(Read from the non-DnD examples or a
     second example; do not add an option to an existing one.)_
- **MIRROR**: `row-drag.spec.ts` for the pointer sequence and the `.first()` locator discipline;
  `rtl-columns.spec.ts` for the RTL method; `columns/resizing.spec.ts` for case 5.
- **GOTCHA**: Four.
  1. Raw `page.mouse` in steps either side of `down`/`up`. `dragTo` is used nowhere in this repo.
  2. Horizontal drag: the clone the library keeps lives in the same `thead`, so `data-column-id`
     matches twice mid-drag — `.first()`, for the reason phase 4 recorded.
  3. Drop onto the **target header's box centre**, measured with `boxOf`, never a computed offset.
  4. **One green single run means nothing.** Run the full spec twice in a row with no edits on both
     projects before concluding anything, against a **freshly restarted** dev server. A stale one
     produced two false results in phase 4.
- **VALIDATE**: `pnpm --filter @ez-kit/docs test:e2e -- --grep 'column drag'`, twice, both projects.

### Task 13: Budget

- **ACTION**: Measure, then decide.
- **IMPLEMENT**: `pnpm build && pnpm size`. `@ez-kit/data-grid-react`'s root sits at **29.02 kB
  against a 29.5 kB limit** — 480 B of headroom, and this phase adds two modules and a compound
  member to that entry. If it overruns, raise the limit **explicitly** in `package.json` and state
  the measured number and what grew, in both the commit body and the changeset. Do not round up
  "for headroom", and do not raise a kit root's budget — those must not move at all (PRD success
  metric), so if one does, stop and find out why.
- **MIRROR**: phase 4's raise, 29 kB → 29.5 kB measured at 29.02 kB, reported in its report.
- **GOTCHA**: `size-limit` measures an entry point whole and **cannot see** what a partial import
  drags along — AGENTS.md states this twice. `tree-shaking.test.ts` is the guard with teeth for the
  compound member, and Task 9 validates against it.
- **VALIDATE**: `pnpm size`.

### Task 14: Changeset

- **ACTION**: Create `.changeset/dnd-header-drag.md`.
- **IMPLEMENT**: `@ez-kit/data-grid-react` minor, `@ez-kit/data-grid-core` minor (the message key),
  `@ez-kit/data-grid-heroui` minor (the handle block, the `Th` ref, the `group` fix). Prose covers:
  the new surface and both doors onto it; that the kits' `Th` now forwards its ref, which a kit
  built against the contract should already have done; the `group` fix and what it unblocks (a grid
  with both axes); and the vendored `table.tsx` edit, named as a registry-payload change.
- **MIRROR**: `.changeset/dnd-row-drag.md`.
- **GOTCHA**: **`@ez-kit/data-grid-shadcn` must not appear**, though this phase changes five of its
  files. It is `private` and changesets-ignored, and `scripts/check-changesets.mjs` fails
  `pnpm lint` on a changeset naming it beside a released package. The shadcn-visible changes ride
  on `@ez-kit/data-grid-react` and on `@ez-kit/docs`, which serves the registry JSON.
- **VALIDATE**: `pnpm lint`.

---

## Testing Strategy

### Unit Tests

| Test                                     | Input                                     | Expected                                          | Edge Case? |
| ---------------------------------------- | ----------------------------------------- | ------------------------------------------------- | ---------- |
| No adapter → no handle                   | plain bundle                              | no slot, no attribute, identical DOM              | **yes**    |
| Handle from both doors                   | render fn + `useDataGridHeaderCell()`     | same element, same accessible name                | no         |
| **Index space is dense**                 | selection + actions + locked + 4 ordinary | one spec per visible leaf, indices `0..n-1`       | **yes**    |
| **Grouped header registers leaves only** | `columns[].columns`                       | group headers and placeholders register nothing   | **yes**    |
| Index is visual, not declared            | a middle column pinned `start`            | its index is `0`                                  | **yes**    |
| `disabled` per column                    | system / `ordering:false` / ordering off  | `true`; `false` for the rest                      | **yes**    |
| Attribute placement                      | adapter reports `isDragging`              | on that `<th>` only; absent with ordering off     | **yes**    |
| One commit per drop                      | `fireDrop` once                           | `setColumnOrder` once, `onChange` once            | **yes**    |
| A refused drop commits nothing           | across a header group                     | neither call fires                                | **yes**    |
| Row axis ignored                         | `fireDrop({ axis: 'row' })`               | column order untouched                            | **yes**    |
| The `<th>` gets the sortable's ref       | any leaf header                           | the node is the `<th>` with that `data-column-id` | **yes**    |
| Adapter sets `group`                     | both kits' `useSortableItem`              | `group === spec.axis`                             | **yes**    |
| React 18                                 | `test:react18`                            | the ref still reaches the `<th>`                  | **yes**    |

### Edge Cases Checklist

- [x] No adapter registered
- [x] Column ordering off while an adapter is registered
- [x] Selection / actions / `ordering: false` columns in the index space
- [x] Grouped headers and placeholder headers
- [x] Pinned columns (visual vs declaration order)
- [x] A drop refused by the core helpers
- [x] `Escape` mid-drag
- [x] The other axis
- [x] RTL
- [x] The resizer still resizing
- [x] React 18 ref semantics
- [ ] A custom `<DataGrid.Header>` rendering a subset of header cells — **documented limitation**,
      not detectable from inside a cell
- [ ] Column virtualization — PRD `Won't`

---

## Validation Commands

```bash
pnpm --filter @ez-kit/data-grid-react typecheck
pnpm --filter @ez-kit/data-grid-react lint
pnpm --filter @ez-kit/data-grid-react test
pnpm --filter @ez-kit/data-grid-react test:react18
pnpm --filter @ez-kit/data-grid-core test
pnpm --filter @ez-kit/data-grid-heroui test && pnpm --filter @ez-kit/data-grid-shadcn test
pnpm build && pnpm lint && pnpm test
pnpm --filter @ez-kit/docs test -- tree-shaking e2e-slots docs-option-names registry-payload
pnpm --filter @ez-kit/docs registry:build && grep -c '@dnd-kit' apps/docs/public/r/data-grid.json  # expect 0
pnpm size
pnpm --filter @ez-kit/docs test:e2e -- --grep 'column drag'   # twice, both projects, fresh server
```

EXPECT: zero errors throughout; **the kit roots' size numbers unchanged**; the react root's number
reported, and its limit raised only with the measurement beside it.

### Manual Validation

- [ ] Drag a column in both kits; neighbours part, one commit on release.
- [ ] `Escape` mid-drag snaps back and writes nothing.
- [ ] Drag a grouped leaf out of its group (shadcn): it snaps back.
- [ ] Resize a column by its resizer with the handle present: still resizes, order unchanged.
- [ ] Under `dir='rtl'`, the column lands where the pointer put it.
- [ ] Tab through a header cell: the handle is the one new tab stop, and the sort affordance still
      sorts on `Enter` / `Space` in **both** kits (heroui cancels the bubbling keydown — see
      `onSortKeyDown`'s docblock).
- [ ] A docs example without DnD is visually unchanged.
- [ ] A grid with **both** axes dragging: both work. This is the `group` fix's only real proof.

---

## Acceptance Criteria

- [ ] A column drags by its header handle in both kits and commits once
- [ ] `dragHandle` reaches a call site through the render args **and** `HeaderCellProvider`, and
      `<DataGrid.ColumnDragHandle />` works in a custom cell body
- [ ] A leaf cannot leave its header group (refused at the commit)
- [ ] The resizer still resizes
- [ ] An RTL spec passes, written as a relation
- [ ] `data-column-dragging` on the `<th>`; `data-slot='column-drag-handle'` on the handle
- [ ] Both kits' `Th` forwards its ref, on React 18 and 19
- [ ] Both adapters set `group`, and a grid with both axes works
- [ ] A grid with no adapter renders identical DOM
- [ ] `data-grid.json` carries no `@dnd-kit`
- [ ] The react root's size number is reported; any raise names the measurement
- [ ] Changeset names react, core and heroui — never shadcn

## Risks

| Risk                                                            | Likelihood | Impact | Mitigation                                                                                           |
| --------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------- |
| **A header cell is skipped and the index space loses density**  | **H**      | **H**  | Task 8 case 3/4 asserts the whole set, not one member. The failure is otherwise silent.              |
| A header-cell context turns out unreachable in heroui after all | M          | **H**  | Task 1 measures it **first**; the fallback is a column registry mirroring `row-drag-registry.tsx`    |
| The `group` fix changes row-drag behaviour                      | L          | M      | Row-only grids have one group either way; `row-drag.spec.ts` must stay green untouched               |
| Playwright horizontal drag is flakier than vertical             | **H**      | M      | Phase 4's exact sequence; `boxOf` centres; two consecutive full runs before any conclusion           |
| The vendored `table.tsx` edit surprises a registry consumer     | M          | M      | Follows the two `forwardRef` edits already there; named in the changeset; `registry-payload.test.ts` |
| The react root overruns its 29.5 kB limit                       | **H**      | L      | Task 13: measure, raise explicitly, name the number                                                  |
| Grouped-header drag is only testable in one kit                 | **H**      | L      | Gate case 4 on the project, with heroui's documented limitation cited                                |
| `verify-manifest-coverage.mjs` fails on two pageless examples   | M          | L      | Task 11 gotcha 3 — check whether it runs in CI before assuming                                       |

## Notes

### Findings that correct or extend the PRD

- **`DragSpec.index` needs a stronger contract than the PRD gave it.** It says "the item's **real**
  index in its axis' order — never its position in a rendered window", which is necessary and not
  sufficient. Measured in `@dnd-kit/dom@0.1.21`'s `OptimisticSortingPlugin`: each group's instances
  are sorted by index and then asserted to be exactly `0..n-1`; a gap or a duplicate makes the
  plugin return early, which costs the visual displacement **and** the commit, because
  `sortable.index` is then never updated and `toDropEvent` sees `index === initialIndex`. The
  docblock is updated with this, and it is the reason the registration set is decided as carefully
  as it is here.
- **Neither adapter sets `group`, and the column axis cannot ship without it.** Every sortable
  currently lands in one `undefined` group, so a grid with rows at `0..7` and columns at `0..4`
  fails the density assertion at the second position and both axes go dead. `type` / `accept`
  partition _collisions_, not the index space. Fixed in Task 5. Phase 4 could not have seen it.
- **The kits' `Th` swallows the ref `ThProps` has demanded since phase 2.** Its docblock even
  predicts the symptom — "a kit that swallows it still renders correctly and still typechecks; the
  affordance just never attaches". Both kits are plain function components: on React 19 the spread
  happens to deliver `ref`, on React 18 it does not, and this repo supports both. Fixed in Task 6,
  with a unit case written so it fails without it.
- **React Aria's `Column` does not write `data-dragging`.** Seven attributes, listed in _External
  Documentation_. So the phase-4 collision does not repeat, and `data-column-dragging` is chosen for
  **namespace consistency**, not as a collision fix. Recorded because the opposite claim would be
  the easy thing to write and would be false.
- **A defect in the row axis, found here, deliberately not fixed here.** `row.index` is the row's
  index within its parent's children, while `GridDndProvider` resolves `getRowModel().rows[index]`.
  The two agree only on page 1 of a flat, unpaginated grid: on page 2 `row.index` starts at the
  page offset (density broken → the drag silently does nothing), and with tree rows a sub-row's
  index duplicates a top-level one. Out of scope — the PRD puts cross-page moves under `Won't` and
  the tree case under phase 9 — but it should become an issue, because the symptom is a drag that
  appears to work and commits nothing.

### On the shape of the drag registration

`DataGridHeaderCell` does **not** own its sortable, and that is the one place this phase does not
mirror `row.tsx`. A row is one component per row, so the hook sits in it. A header cell is one
component for three different kinds of header — a leaf, a group, a placeholder — and only the first
may register, because the other two are not members of the leaf order the index counts in. A hook
cannot be skipped, so participation has to be a _component_ decision, which is what `ColumnDragShell`
is. The knock-on is that `isDragging` is not in the render args (the parent does not know it): the
`<th>` carries `data-column-dragging` for CSS, and `useColumnDrag()` is the public read for anyone
who needs the boolean in JavaScript. The PRD's scope line for this phase names `dragHandle` only, so
this is within scope rather than a reduction of it — but the asymmetry with the row is real and is
written into both docblocks rather than left for someone to trip over.

### On the index space, for phase 6

The header's index space is `getVisualLeafColumns(table)` with `ColumnMoveScope.Visible`. The
visibility panel is the same `axis: 'column'` but a **different** space — every leaf column,
including hidden ones, with `ColumnMoveScope.All` — so the two surfaces cannot share one group
without breaking density the moment both are mounted. Phase 6 therefore needs either its own
`group` value or a decision that the two surfaces are never draggable at once. That is phase 6's
call; it is flagged here because the density fact is what makes it a real constraint rather than a
tidiness question, and because the `case DragAxis.Column` arm in Task 4 resolves against the
header's list and will need to learn which surface a drop came from.

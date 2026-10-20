---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Reorder the entries of the multi-sort builder. An entry's place in `<DataGrid.SortMenuTrigger />` is
its priority, and each entry now carries a pair of steps that moves it one place up or down — or,
with a drag adapter bound, a grip it is dragged by, from the pointer or the keyboard. A step or a drop
keeps every entry's direction and is one `sorting.onChange`. `sorting.multi.reorderable` chooses the
affordance and defaults to `true` whenever multi-sort is on.

The choice is spelled with a new closed set, `ReorderMode` (`'drag' | 'step' | 'both'`), which every
reorderable surface now takes as `boolean | ReorderMode`: `true` means the grip with an adapter and
the steps without one, `false` turns the surface's reordering off, and `'drag'` / `'both'` without an
adapter fall back to the steps with a development warning naming the option.

**Breaking:** the column surfaces move to the same vocabulary. `ordering.column.drag` and
`ordering.column.moveControls` are replaced by `ordering.column.header`, the object form of
`ordering.column.visibilityMenu` by `boolean | ReorderMode`, and `VisibilityMenuOrderingConfig` is
removed. A combination that offered nothing is now written `false`, so the "offers neither"
warning is gone.

| Before                                                   | After                                    |
| -------------------------------------------------------- | ---------------------------------------- |
| `ordering.column.drag: false`                            | `ordering.column.header: 'step'`         |
| `ordering.column.moveControls: true`                     | `ordering.column.header: 'both'`         |
| `ordering.column.drag: false, moveControls: false`       | `ordering.column.header: false`          |
| `ordering.column.visibilityMenu: { drag: false }`        | `ordering.column.visibilityMenu: 'step'` |
| `ordering.column.visibilityMenu: { moveControls: true }` | `ordering.column.visibilityMenu: 'both'` |
| `ordering.column.visibilityMenu: { drag: true }`         | `ordering.column.visibilityMenu: 'drag'` |
| `ordering.column.visibilityMenu: {}`                     | `ordering.column.visibilityMenu: true`   |

**Behaviour change:** **Add Sort** in the builder now follows `sorting.multi`. With multi-sort off —
including `multi` left unwritten — it is unavailable once one entry exists, it stops at
`multi.max`, and a column declared with `sorting: { multi: false }` is offered for the first entry
only — and no step or drop moves it below the first place. A Shift-click on a header is unchanged. Write `sorting: { multi: true }` to keep building
several entries.

- `SortMenuItem` gains `label` and an optional `ordering` pair, the same shape as
  `VisibilityColumnItem.ordering`.
- `<DataGrid.SortItem sortId>` (also `DataGridSortItem`) is the builder's row, with an element form
  and a render-function form handing over `itemProps` (`data-slot="sort-row"`), `handleProps` and
  `isDragging`, as `<DataGrid.VisibilityItem>` does for the column panel. `useSortItemDrag()` reads
  its drag state from the element form, and `useSortDragKeyboardGuard()` keeps keys away from the
  builder's controls during a keyboard drag.
- `useStepFocus` (with `StepSide`) keeps keyboard focus on a list's step pair across the step it
  triggers, landing on the other button when the pressed one reaches an end; both kits' builders use
  it. `SORT_DRAGGING_SELECTOR` lets a popover tell a drag's `Escape` from its own dismissal — both
  kits' builders stay open when `Escape` cancels a keyboard drag.
- The drag port gains a third axis, `DragAxis.Sorting`, whose drops write `sorting`. An adapter of
  your own that switches over `DragAxis` exhaustively needs a `sorting` arm, and one that lists the
  axes it accepts needs the new value.
- New messages: `sorting.moveUp` / `moveDown` / `dragSort` and `ordering.sortPickedUp` /
  `sortMovedTo` / `sortDropped` / `sortCancelled`. A partial dictionary is unaffected; a complete
  `GridMessages` object has to add them.

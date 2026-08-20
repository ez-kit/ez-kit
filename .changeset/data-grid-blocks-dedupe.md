---
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Fix the toolbar Sort button stretching, and de-duplicate the kit blocks.

**Breaking (DOM contract):** the toolbar's `SortMenu` trigger now carries
`data-slot="sort-menu-trigger"` instead of `data-slot="sort-trigger"`. It collided with the
column header's sort trigger, so the shared structural stylesheet's unscoped
`[data-slot='sort-trigger'] { flex: 1 }` rule stretched the toolbar button across the toolbar's
right group. Restyle against the new name if you were targeting that button.

Internals, no visual change: `EmptyState` / `NoResultsState` now share a `StatePlaceholder`,
`ActionsCell` / `CreatingActionsCell` share a `SaveCancelButtons` pair, and the dropdown icons
for both menus moved into a per-kit `blocks/icons.tsx`.

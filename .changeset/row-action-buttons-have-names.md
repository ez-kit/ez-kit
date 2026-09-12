---
'@ez-kit/data-grid-shadcn': patch
'@ez-kit/data-grid-heroui': patch
---

Give the row-actions cell's icon buttons an accessible name.

Edit, Delete and the inline editing row's Save / Cancel are icon-only in both kits and carried no
label of any kind — a screen reader announced four indistinguishable "button"s at the end of every
row, and the destructive one among them was unannounced as such.

They now take `aria-label` from the grid's message dictionary: `rowActions.edit` / `rowActions.delete`
— the same strings the menu placement already renders as visible text — and `form.save` /
`form.cancel` for the pair. Nothing visual changes, and a custom inline action was already labelled
from its own `item.label`.

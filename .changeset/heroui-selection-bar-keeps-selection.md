---
'@ez-kit/data-grid-heroui': patch
---

Fix the heroui selection bar clearing the selection out from under the action that was just pressed. `ActionBarItem` dismisses the bar after a press, the way a menu closes behind a chosen entry, and for this bar "dismissed" means `onOpenChange(false)` → clear the selection — so a bulk delete awaiting its confirmation dialog found nothing left to delete and removed no rows. The bar's items now cancel that select event; the × remains the only control that clears the selection.

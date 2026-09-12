---
'@ez-kit/data-grid-react': patch
---

Stop `editing.mode: 'modal'` from opening the row behind its own dialog.

Every mode but `cell` sets the same `editing.rowId`, and the body cell tested only for that — so
raising the edit dialog also swapped the target row's cells for inputs. The row underneath the
overlay became a second live form bound to the same values: four extra focusable controls, a row
that changed height on open, and a duplicate of every field in the accessibility tree.

It stayed invisible for as long as it did because a Radix dialog `aria-hidden`s everything behind
it, so under shadcn the second form was in the DOM but not in the accessibility tree; HeroUI's
overlay does not, and there both were reachable. The cell now opens for `row` and `cell` only.

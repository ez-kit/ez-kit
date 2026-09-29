---
'@ez-kit/data-grid-core': minor
---

Drop helpers for row and column ordering, and a step that passes a pinned item

`canDropColumn` / `dropColumn` and `canDropRow` / `dropRow` validate and describe a **direct** move
of one row or column onto another — the shape a drag needs, where the existing `move*` helpers
describe a step to the adjacent item. `table.ordering` gains `canDropRow` / `dropRow`, so the
controlled/uncontrolled switch stays in one place. A drop enforces exactly what a step enforces, by
asking the step path whether the target is reachable rather than by keeping a second copy of its
rules.

Squaring the two paths turned up one place where the step was wrong, and fixing it changes behaviour.

Pinning is orthogonal to the order, so a pinned item can sit **between** two items of one band while
being rendered away from both of them — the user sees those two side by side. The move rules treated
the pinned item as the end of the order and refused, which left the two visible neighbours unable to
be reordered from the menu or by `Alt+Arrow` at all.

A foreign band is now stepped over. A foreign parent still ends the walk, because leaves under one
parent are contiguous and crossing that boundary is a different operation; so is a **locked** item,
because `ordering: false` fixes a column's place and moving another column past it would change its
index. Those two distinctions are what the rules are about, and the band was never one of them.

`canMoveRow` / `moveRow` / `canMoveColumn` / `moveColumn` all gain the wider reach. Nothing narrows:
every arrangement these helpers allowed before, they still allow.

Both axes resolve a drop by asking this step path whether the target is reachable, rather than by
keeping a second copy of the rules beside it. That is not a behaviour change on its own — it is what
makes the paragraph above true of drags as well as of menu entries.

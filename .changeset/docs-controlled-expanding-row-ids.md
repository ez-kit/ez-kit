---
'@ez-kit/docs': patch
---

Fix the controlled-expanding example's row ids.

It built its expanded map from the row index (`'0'`…`'3'`) while the grid keys a row by its `id`
field when the data has one (`'1'`…`'4'`). "Expand all" therefore opened three of the four rows,
left the last one shut, and wrote one id that matched no row — on the page that teaches a reader
how to drive `state.expanded` from outside the grid.

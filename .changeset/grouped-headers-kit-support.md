---
'@ez-kit/data-grid-heroui': patch
---

Grouped headers (`columns[].columns`) render flat instead of crashing the grid.

The kit fed every level of the header into React Aria's collection as sibling columns, so a
two-group / four-leaf header registered six columns against four cells per row and the collection
threw before a row was drawn: `Cell count must match column count. Found 4 cells and 6 columns.`

There is no shape that fixes it here. React Aria **removed** nested column support before its GA
([#5537](https://github.com/adobe/react-spectrum/pull/5537)), and the request to bring it back
([#5263](https://github.com/adobe/react-spectrum/issues/5263)) has been open since 2023 with no API
proposed — a `Column` nested inside a `Column` is not a collection node there, verified in a
browser with and without this kit's own components in the way.

So the group rows are dropped and the leaf row renders alone, with one warning in development
naming the limitation. Every leaf column keeps its sorting, filtering, menu and resize handle; only
the group row is missing. **The shadcn kit renders grouped headers correctly.**

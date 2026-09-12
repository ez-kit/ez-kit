---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': patch
---

data-grid: lay the column grid out in the order the cells are rendered in

Pinning a second column to one edge left a gap between it and the column already
pinned there, with the scrolling body visible through it.

The row's `grid-template-columns` was built from `table.getVisibleLeafColumns()`,
which — despite the name — is `getAllLeafColumns().filter(visible)`: the
**declaration** order, with pinning ignored. Every rendered row and header group is
`[...left, ...centre, ...right]` instead. The two agree only while the pinned
columns sit at the declaration order's own extremes, which is the default (selection
first, actions last) and is why this went unnoticed. Pin anything else and the cells
land in the wrong tracks, take a neighbour's width, and the sticky offsets — which
are computed per pin group, so in visual order — miss by the difference between the
two declared widths.

The new `getVisualLeafColumns(table)` export returns the visual order, and the grid
template, the creating row and the HeroUI row-header lookup all read it.

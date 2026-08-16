---
'@ez-kit/data-grid-react': patch
---

Fix pinned columns coming unstuck near the end of horizontal scroll.

The rows carry the column grid while the table around them is a block box, so it took
the scrollport's width and the grid tracks overflowed it. A sticky cell is clamped to
its containing block, so once the row's right edge scrolled past a left-pinned cell the
browser dragged that cell out of view with the content — leaving only the pin shadow
behind. The table box is now floored at the summed column widths via a new
`--dg-table-min-width` variable.

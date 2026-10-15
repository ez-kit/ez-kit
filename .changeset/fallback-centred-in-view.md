---
'@ez-kit/data-grid-react': patch
---

**The empty and no-results fallbacks are centred in the visible area of a grid that scrolls
sideways.** Both render in a cell that spans every column, so on a grid wider than its scrollport
the message was centred in the full width of the table and could sit partly or wholly off-screen.

The shared layer now wraps the cell's content in a `data-slot="fallback-content"` box, and the
structural stylesheet holds that box to the scrollport's visible width (a container query on
`table-scroll`) and sticks it to the start edge, so the message stays centred while the grid
scrolls. To make that hold in every kit, the stylesheet resets the padding, clipping and content
alignment of `empty-state-cell` and `no-results-cell`; a kit that styled the fallback on those cells
should style it inside `fallback-content` instead.

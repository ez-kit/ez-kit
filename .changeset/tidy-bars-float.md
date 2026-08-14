---
'@ez-kit/data-grid-heroui': patch
'@ez-kit/data-grid-shadcn': patch
---

fix(data-grid): floating selection bar no longer affects layout

The floating selection bar was itself the `sticky` element, which stays in flow. In the
heroui kit it mounted only once a row was selected, so selecting grew the grid by the bar's
height and shifted everything below it; in the shadcn kit it was mounted permanently, so it
reserved that height under every grid even with nothing selected.

Both kits now render the bar absolutely inside a zero-height sticky anchor
(`data-slot="action-bar-anchor"` / `data-slot="selection-bar-anchor"`). The bar overlays the
last rows instead of displacing them, and the grid's height is identical whether or not rows
are selected. Sticky-to-scrollport behaviour, `align` and `sideOffset` are unchanged.

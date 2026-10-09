---
'@ez-kit/data-grid-react': minor
---

Virtualized body rows are now positioned in normal flow, with the window offset by the body's own
band — the tbody's `padding-top` / `padding-bottom` — rather than by a per-row `transform`, and the
scroll range reserved with `min-height` rather than a fixed `height`. A row dragged in a virtualized
grid now displaces its neighbours while the pointer is down, exactly as it does in a non-virtualized
one, and a one-place drag commits wherever it is released. The infinite loader is in flow after the
band and so sizes to its own content, which retires the fixed allowance that used to budget for it
and keeps a wrapped error message from being clipped.

While a row is held, a virtualized body now renders the arrangement the drag is showing — the order
with the held row moved to where the pointer has carried it — rather than the saved order. Before,
the neighbours stopped moving aside for the rest of the gesture once the drag's auto-scroll had
turned the window over, because the body re-rendered the held row at its old place while the drag
library had moved it. Nothing is committed mid-gesture: `ordering` and `onOrderChange` still change
only on release, and `Escape` restores the saved order. The drag port gains an optional
`DndProviderProps.onDisplace`, which both kits' adapters call for every hover the grid allows; an
adapter of your own that does not call it keeps working, and only loses the displacement after a
window turnover.

One consequence is worth checking if you style the grid yourself: a vertical `margin` on
`[data-slot='tr']` used to be inert in a virtualized grid, because the rows were out of flow. Now
that they are in flow it shifts the band's geometry, and by a different amount depending on the UI
kit — where the tbody is a grid container the adjacent rows' margins add up, and where it is a block
they collapse to the larger of the two. Size rows with `height` or padding rather than with a
vertical margin.

Also fixes pinned-row stacking in a virtualized grid: the scrollport never stamped
`data-sticky-header` / `data-sticky-footer` in virtualized mode, so pinned-top rows stuck at the
scrollport's own edge and sat under the sticky header instead of below it.

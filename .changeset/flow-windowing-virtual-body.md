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

Also fixes pinned-row stacking in a virtualized grid: the scrollport never stamped
`data-sticky-header` / `data-sticky-footer` in virtualized mode, so pinned-top rows stuck at the
scrollport's own edge and sat under the sticky header instead of below it.

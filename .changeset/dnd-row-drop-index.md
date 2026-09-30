---
'@ez-kit/data-grid-react': patch
---

Fix: a row's drag index is its position in the row model, not `row.index`.

Row dragging silently did nothing on any page but the first, under any column filter, and on any grid
with tree rows. The row registered TanStack's `row.index` — a row's place among its **parent's**
children in the core model — which coincides with a position in the rendered list only on page one of
a flat, unfiltered grid. On page two the registered indices start at the page offset, a filter leaves
gaps where the filtered-out rows were, and a tree sub-row's index duplicates a top-level row's.

The drag library requires each index space to be exactly `0..n-1` with no gap and no duplicate, and
bails out of the whole space when it is not: the handle works, the pointer moves, nothing displaces
and nothing commits. Nothing in the DOM shows why.

Both sides now read one helper, so the index a row registers and the list a drop's target is resolved
against cannot drift apart again. That list is the rows the body actually renders — the pinned top
band, the centre, then the pinned bottom band — rather than the row model: under `keepPinnedRows`,
which is the default, a pinned row keeps rendering after a page change or a filter has taken it out of
the row model, and it needs an index like any other row. Rendered order also matters beyond density,
because it is the order the drag library's projection displaces by. A drop across a band is refused by
`dropRow` exactly as a drop across a header group is refused by `dropColumn`, so the bands need no
index space of their own.

Row dragging in a **virtualized** grid is still not supported: the body renders a window, so the rows
outside it register nothing and the space has gaps. That is its own phase of the drag work and is not
done.

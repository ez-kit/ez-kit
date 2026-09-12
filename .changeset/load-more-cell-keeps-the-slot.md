---
'@ez-kit/data-grid-react': patch
---

Give the load-more row's cell a `data-slot`.

The row itself is marked `data-slot="load-more-row"`, but the full-width `<Td>` inside it was
written without one — in both the plain and the virtualized body — so it fell through to the kit's
own default (`data-slot="table-cell"` under shadcn) and stopped matching any selector written
against the documented contract.

Found by the new `contract/row-slot` sweep, which asserts that every row and cell the grid puts in
its body carries a slot this layer owns. That sweep exists because this is the fourth instance of
the same defect; the previous three were each found by accident while testing another feature.

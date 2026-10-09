---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

Aggregates the server computed, rendered rather than recomputed.

`aggregation: { manual: true, totals: { revenue: 232000 } }` supplies a grand total per column id.
A column needs no `aggregation` of its own for one to render, so a grid whose numbers all come from
the server registers neither `rowAggregationFeature` nor `aggregationFns` — and `manual` is what
stops the footer quietly totalling the rows the client happens to hold, which under
`filtering.manual` or `pagination.manual` is one page shown as if it were the dataset.

Server grouping is `groupedRowModel: createManualGroupedRowModel()` plus `grouping.getSubRows` for a
tree, or the model's `isGroupRow` / `getLevel` adapters for a flat response. Group subtotals need no
option at all: they are ordinary fields on the group row the server sent.

`grouping.manual` is gone. It set upstream's `manualGrouping`, which hands back the ungrouped row
model — and since group-row behaviour keys on `row.groupingColumnId`, which only a grouped model
sets, it rendered an empty `__group__` column and dropped the grouped column from the list.

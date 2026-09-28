---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Render group rows, column aggregates and a footer grand total.

The `__group__` column's cell carries a group's label, how many rows it holds and its chevron. It
is **composed, not a new contract slot** — `core.Td`, the existing `expanding.Chevron` and text —
so `FEATURE_COMPONENTS` and `FEATURE_OPTIONAL_COMPONENTS` are unchanged and a kit styles it
through `data-slot='group-cell'` + `data-system-column='group'`. A group row is stamped
`data-group-row='true'` and announces `aria-expanded`; its nesting shows through the `data-depth`
the indentation rules already read.

A column with an `aggregation` renders its subtotal on each group row, through
`aggregation.component` when one is supplied and otherwise through the column's **existing**
cell-type view — so a `number` column's subtotal is formatted the way its values are. The cell is
marked `data-aggregated-cell='true'`.

**A footer cell now falls back to the column's grand total.** A column that wrote `aggregation`
and no `footer` renders `column.getAggregationValue()` there, which needs no grouping at all:
`rowAggregationFeature` alone is enough. A column's own `footer` still wins, so no existing
grid's footer changes.

A group row is not a record, so it offers no row actions, and row-move controls are refused
outright while a grouping is applied — the same rule that already refuses them under a sort, and
for the same reason: the order is computed, so a manual move would spring back.

Two controls ship with it. The column menu gains a **Grouping** section — `Group by this column`,
gated on `column.getCanGroup()`, so it is absent on a column that wrote `grouping: false` and on a
grid that does not group. And `<DataGrid.GroupByBar />` (also exported as `DataGridGroupByBar`)
renders one chip per active level, outermost first, each with a menu that moves the level in or
out of the nesting or drops it; it renders `null` when nothing is grouped. Mounted by
composition, never by an option: `<DataGrid.Toolbar start={<DataGrid.GroupByBar />} />`.

Note that **dropping a level is the bar's job, not the column menu's**: `groupedColumnMode:
'remove'` takes a grouped column out of the list, so it has no header cell to hang a menu on.

Both kits gained `GridMenuIcon.Group` / `.Ungroup` glyphs, and each styles the seven new slots —
`group-cell`, `group-label`, `group-count`, `group-by-bar`, `group-by-bar-label`, `group-by-chip`
and `group-by-chip-label`. `renderGrid` in the package's test
utilities is now generic over the row type.

The grid's body, header and table now re-derive on the `grouping` slice. Without that a grouping
applied **after** the first render moved the state without re-rendering either — the group-by bar
updated while the table stayed flat and kept showing the grouped column.

---
'@ez-kit/data-grid-core': minor
---

Row grouping and aggregation gain a config surface.

`columnGroupingFeature`, `rowAggregationFeature`, `createGroupedRowModel` and `aggregationFns` have
always shipped from `@ez-kit/data-grid-core/features`; what was missing was anything a consumer
could write that reached them. Now there is:

- **`TableConfig.grouping`** — `boolean | GroupingConfig`, with `by` (the starting levels), `mode`
  (`GroupingMode.Single` / `.Multiple`), `column` (a `SystemColumnDef` for the auto-injected
  `__group__` column), `getSubRows` (rows that arrive already grouped, as a tree — pair it with
  `groupedRowModel: createManualGroupedRowModel()`) and `onChange`. A grouped grid gets a fourth
  system column between `__expand__` and the user's columns, and the grouped column itself is
  taken out of the list while it is grouped, so its value is not shown twice.
- **`ColumnDef.grouping`** — `false` to lock a column out of being a grouping level, or
  `{ getValue }` to group by a derived value (the month of a date, a bucket, a first letter).
- **`ColumnDef.aggregation`** — `'sum'` and the ten other built-in names, or `{ fn, component }`
  to add a renderer. Independent of grouping in both directions: a column totals into the footer's
  grand total through `rowAggregationFeature` alone, with no grouped row model, which is what the
  two features are split apart for.

Grouping requires `columnGroupingFeature`, `groupedRowModel`, `rowExpandingFeature` and
`expandedRowModel` in the feature set — a group row is a row with `subRows`, and expansion is what
opens it. Development-mode guards now warn when `grouping` is configured without
`columnGroupingFeature`, when a column is aggregated without `rowAggregationFeature`, and when a
column names an aggregation without the `aggregationFns` registry — the last of which used to
resolve to nothing and total silently.

Also new: `GroupingMode`, `GroupingConfig`, `ColumnGroupingConfig`, `ColumnAggregationConfig`,
`ColumnAggregationMeta`, `BuiltInAggregationFn`, `GROUP_COLUMN_ID`, `SystemColumnType.Group`,
`GridMenuIcon.Group` / `.Ungroup`, and the `columnMenu.grouping` / `.groupBy` / `.ungroup` and
`groupBar.*` message keys.

Rendering — the group cell, the aggregated and placeholder cells, the footer total and the
controls — follows.

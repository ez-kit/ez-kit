---
'@ez-kit/data-grid-core': minor
---

`filtering.operators` is now the table-wide switch for operator selectors, not only the custom-operator registry.

- `filtering: { operators: true }` gives every filterable column the default operators for its `cell.type`.
- `filtering: { operators: false }` gives none of them one, overriding any column that asks.
- `filtering: { operators: { items } }` registers custom operators (addressable by id from a column's `filtering.operators.items`) **and** switches selectors on, the way the bare `true` does — so adding a custom operator to a working `operators: true` cannot silently take the selectors away.
- Omitting the option keeps the previous behaviour: the decision stays per column.

A column overrides the table in both directions — `filtering: { operators: false }` opts one column out of a table-wide `true`, `filtering: { operators: { items } }` narrows what it offers. Group headers and columns with `filtering: false` never inherit.

**Breaking:** the table-level option changed shape from `FilterOperatorDef[]` to `boolean | TableOperatorsConfig`. Move a custom-operator array into `items`: `filtering: { operators: [myOp] }` → `filtering: { operators: { items: [myOp] } }`. Note the object form now also enables selectors on every column that has not opted out.

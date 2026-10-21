---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

The filter operator moves into the filter's row. It used to sit on a row of its own under the
input, which made every column with operators a line taller and left the columns without them
misaligned beside it. Now it is the first control in the row, before the input, the range, the
multi-select or the column's own component, and an operator that takes no value (`isEmpty`) shows
its label where the input would be, so the row keeps its height.

- **Breaking (kit slot, behaviour):** `OperatorSelect` is a button that opens a menu, not a
  select. Both kits show the current operator's label, clipped to the button's width, and the menu
  lists every operator with the current one checked. Tests that looked for a `combobox` named
  `Filter operator` look for a button instead.
- The button's accessible name carries the operator: the new `messages.filtering.operatorTrigger`
  gives it, `Filter operator: Contains` by default. A dictionary without it keeps the English
  default. `messages.filtering.operator` now names the menu.
- Operators can show an icon instead of their label. `FilterOperatorDef.icon` sets one on a
  definition, and the new top-level `icons: { operators }` option sets them by operator id. That
  option switches nothing on, so it can sit in `createDataGrid({ defaults })` or a
  `DataGridOptionsProvider`, and its layers merge per id. Labels stay the default, as decided in
  #63. `DEFAULT_OPERATOR_ICONS` is a ready set of signs for the built-ins
  (`icons: { operators: DEFAULT_OPERATOR_ICONS }`).
- `FilterModel.operators` and `OperatorSelectProps.operators` are `FilterOperatorOption[]`, the
  definition with its icon settled. An external kit keeps compiling.
- **Breaking (behaviour):** a definition in the table's `filtering.operators.items` that reuses a
  built-in id now replaces that built-in in every column of every cell type that offers it,
  including the default sets (`operators: true`). It used to reach no column at all, although the
  docs said it replaced the built-in everywhere. Replace `equals` and text, number, date and boolean
  columns all compare through your `filterFn`. A replaced operator keeps the label its author wrote.

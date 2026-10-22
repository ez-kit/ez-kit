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
  select. Both kits show the current operator's icon when its definition has one, else its label, clipped
  to the button's width, and the menu
  lists every operator with the current one checked. Tests that looked for a `combobox` named
  `Filter operator` look for a button instead.
- The button's accessible name carries the operator: the new `messages.filtering.operatorTrigger`
  gives it, `Filter operator: Contains` by default. A dictionary without it keeps the English
  default. `messages.filtering.operator` now names the menu.
- Operators can show an icon instead of their label: `FilterOperatorDef.icon` sets one on the
  definition, which is its only source. Labels stay the default, as decided in #63.
  `DEFAULT_OPERATOR_ICONS` is a map of ready signs for the built-in ids, to copy into the `icon` of
  the definitions a grid is given.
- `FilterModel.operators` and `OperatorSelectProps.operators` are `FilterOperatorOption[]`, the
  definition with its icon typed for React. An external kit keeps compiling.

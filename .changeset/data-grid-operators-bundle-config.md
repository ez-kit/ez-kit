---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Filter operators become bundle config, by cell type, the way `features` is. `operators: { byType,
defaultByType }` maps each cell type to the definitions its columns offer and to the one they open
with. Set it in `createDataGrid({ operators })`, on a `DataGridOptionsProvider` or on a grid: a
layer replaces the set of each cell type it names and keeps the others. It switches nothing on —
`filtering.operators` still does. Both kits' prebuilt `DataGrid` passes the ready-made set, so a
grid built from a kit root offers the same operators as before; a grid composed through
`createDataGrid` has the operators it names and no others, and `filtering.operators: true` without
a set warns once in development.

- The ready-made set, `defaultOperators`, moves to a new subpath, `@ez-kit/data-grid-core/operators`,
  with `FilterOperator` and `DEFAULT_OPERATOR_ICONS`. Importing the constants no longer carries the
  comparisons, and `createTable` no longer reaches any of them.
- **Breaking:** `FilterOperatorDef` takes a required `input: 'none' | 'single' | 'range' | 'list'`
  (`OperatorInput`), which types the value `filterFn` receives. `requiresInput` is removed — write
  `input: 'none'`. `filterFn` is never called with an empty value unless `input` is `none`.
- **Breaking:** the grid reads an operator's behaviour from its `input`, never from its id: the
  editor, empty values in a batch write, which date presets apply, and whether the active-filter
  chip shows a value. An operator of your own with `input: 'range'` gets the range control, one
  with `input: 'list'` the multi-select.
- **Breaking (behaviour):** switching between operators that take a different `input` now drops
  the value — `in` to `equals` used to keep the array, `contains` to `in` the string. Between two
  operators with the same `input` the value is kept, so `between` to a custom `notBetween` keeps the
  range.
- **Breaking:** an operator's label is its definition's `label`, and nothing else.
  `messages.operators` is removed with `localizeOperators`; a translated grid passes a translated
  set — copy the definitions with new labels. The date presets' labels move from
  `messages.operators.presets` to `messages.filtering.presets`, and the preset menu's own name from
  `messages.filtering.presets` to `messages.filtering.presetMenu`.
- **Breaking:** the table-level `filtering.operators.items` registry is removed, with
  `TableOperatorsConfig`; the table-level `filtering.operators` is a `boolean`. Replace an operator in
  the set of each cell type that should get it. A string in a column's `filtering.operators.items`
  is looked up in that column's own cell type's set only.
- **Breaking:** `defineCellType({ operators, defaultOperator })` is removed — it was never read. A
  project cell type gets operators from `operators.byType[itsType]`.
- **Breaking:** the main entry no longer exports `FilterOperator`, `DEFAULT_OPERATOR_ICONS`,
  `DEFAULT_OPERATORS_BY_TYPE`, `DEFAULT_OPERATOR_ID_BY_TYPE`, `TEXT_OPERATORS`, `NUMBER_OPERATORS`,
  `DATE_OPERATORS`, `BOOLEAN_OPERATORS`, `IN_OPERATORS`, `SELECT_BADGE_OPERATORS`,
  `EMPTY_OPERATORS`, `buildOperatorRegistry` or `OperatorRegistry`. Take the first two from
  `@ez-kit/data-grid-core/operators`, and the sets from `defaultOperators.byType`.
- A filter restored with an operator its column does not offer — a link made against another set —
  still keeps every row, and now warns once per column in development. A value of the wrong shape
  for its operator (a scalar under a list operator) keeps every row too, instead of reaching the
  comparison. A set listing an id twice, a definition without a valid `input`, and a
  `defaultByType` entry its set does not have each warn once in development.
- `isEmptyOperatorValue(input, value)` is exported from the main entry: the rule the row filter and
  the filter panel use for whether a value states anything.

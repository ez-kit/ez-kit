# 0005. One filter-operator vocabulary; behaviour comes from `input`

- Status: Accepted
- Recorded: 2026-10-26 (moved from `AGENTS.md`; the decision itself predates this record)

## Decision

**One filter-operator vocabulary; behaviour is read from `input`, never from the id.** Operators are bundle config (`createDataGrid({ operators })`; `defaultOperators` bound only in each kit's `data-grid.tsx`). No type-specific spelling of an existing comparison, no table-level registry, no `messages.operators`. `inputOf` (`data-grid/operator-input.ts`) is the one lookup — an `=== 'between'` in a package is the regression. `filterFn` stays a method.

## Context, rationale and rejected alternatives

- **One filter-operator vocabulary across cell types — a property of the ready-made set, not of
  the package.** Operators are bundle config, by cell type: `createDataGrid({ operators: { byType,
defaultByType } })`, overridable per type in any options layer, with the ready-made
  `defaultOperators` on `@ez-kit/data-grid-core/operators` and bound only in each kit's
  `data-grid.tsx`, exactly as `allDataGridFeatures` is. Within that set `FilterOperator` is a single
  closed vocabulary: the same id means the same comparison whatever the column's cell type is, and
  only the `label` changes (`greaterThan` reads "Greater than" on a number column and "After" on a
  date one). Adding a type-specific spelling of an existing comparison to it — a second `eq` beside
  `equals`, an `after` beside `greaterThan` — is the defect this replaced, not an improvement on it.
  A project's own set may name its operators anything; the grid reads no behaviour off an id, using
  one only to find the definition a filter value names. There is no table-level
  operator registry and no `messages.operators`: a label is the definition's `label`, an icon its
  `icon`, and a translated grid passes a translated set. Two measured facts hold the subpath
  together and neither should be re-argued: the definitions are object literals of **literals**,
  because esbuild keeps an object that reads a property (`FilterOperator.Contains`,
  `OperatorInput.Single`) and everything it names, so `{ FilterOperator }` alone carried every
  comparison; and the lists name their members one by one, because a spread is kept the same way.
  `apps/docs/test/tree-shaking.test.ts` pins both, and that `createTable` never reaches the entry.
- **The grid reads an operator's behaviour from its `input`, never from its id.** `input` —
  `none | single | range | list`, the `OperatorInput` closed set — is required on every
  `FilterOperatorDef`, which is a union over it, and it alone decides the editor, what switching
  operators keeps (the same `input` keeps the value, another drops it, entering a range starts
  `{}`), which date presets apply, whether an empty value is a filter, and whether the
  active-filter chip shows a value at all (it shows other values by their shape).
  The one lookup is `inputOf` in `data-grid/operator-input.ts`; core's dispatcher never calls a
  non-`none` `filterFn` with an empty value. An `=== 'between'` or a set of ids in a package is the
  regression, whatever it is guarding: an author's `notBetween` with `input: 'range'` must get the
  range control because of its `input`. `filterFn` is declared as a **method** so that a
  `FilterOperatorDef<number>` assigns into `FilterOperatorDef[]` without a cast; do not "fix" it
  into a property.

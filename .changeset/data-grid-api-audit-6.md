---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Sixth API audit pass over the data grid: one vocabulary per concept, and the options that were
documented but not implemented.

**Filter operators are one closed set.** `FilterOperator` (const object + same-named union)
replaces three overlapping vocabularies — text spelled equality `equals` while number and date
spelled it `eq`; number spelled comparison `gt` / `gte` / `lt` / `lte` while date spelled it
`after` / `onOrAfter` / `before` / `onOrBefore`. The same id now means the same comparison on
every cell type and only the label changes ("Greater than" on a number column, "After" on a date
one). `column.filtering.defaultOperator`, `ColumnOperatorsConfig.items`,
`StructuredFilterValue.operator` and `CellTypeDefinition.operators` are typed `FilterOperatorId`
instead of `string`. Renames: `eq` → `equals`, `neq` → `notEquals`, `gt` → `greaterThan`,
`gte` → `greaterOrEqual`, `lt` → `lessThan`, `lte` → `lessOrEqual`, `after` → `greaterThan`,
`onOrAfter` → `greaterOrEqual`, `before` → `lessThan`, `onOrBefore` → `lessOrEqual`. Text columns
gain `notEquals`.

An operator id that resolves to nothing made the filter match every row, silently — the
dispatcher answers `true` for an operator it does not know. `createTable` now warns in
development, both for `defaultOperator` and for an unknown id in `operators.items`.

**`filtering: { operators: true }` works on every built-in cell type.** `boolean`, `progress`,
`image` and `link` had no default operator set, so the option attached no filter function,
published no operator list and warned about nothing. `progress` now takes the number operators,
`image` / `link` the text ones, and `boolean` gains its own equality pair. A `satisfies` clause
keeps the two lookup tables exhaustive over `BaseCellTypes`.

**`column.creating.component` falls back to `column.editing.component`,** as its own JSDoc and
the validation docs have said in three places. The create form read `meta.creating` alone, so a
column that declared only `editing.component` rendered its custom input while editing and the
generic fallback input while creating. The fallback is now per **field** (`component`,
`description`, `validateOn`, `debounce`) through one shared `resolveColumnFormConfig`, which the
headless creating feature and the React form layer both use — the two timing fields used to fall
back per object, so setting only `creating.description` dropped `editing.validateOn`.

**Cell-type registry slots are named for their features:** `edit` → `editing`,
`filter` → `filtering` (`view` and `creating` unchanged). A column already spells the same four
things `cell.component` / `editing.component` / `creating.component` / `filtering.component`.

**`ColumnMeta.cell` replaces `cellType` / `config` / `cellView`,** so the resolved value carries
the name of the column option it holds, like every sibling on that interface.

**DI contract groups match the config vocabulary.** `'row-actions'` → `rowActions` (the one
kebab key, and the one a kit had to quote); `ConfirmDialog` moves to a new `deleting` group,
matching the feature that owns it; `NumberInput` moves to `core`, beside `Input` and `Checkbox`.

**`globalFiltering.fn` is typed.** `BuiltInGlobalFilterFn` + `GlobalFilterFnId` replace the bare
`string` that was passed straight through to TanStack, where a typo silently changed what the
search box matched.

**The three system columns are configurable.** `selection.column`, `expanding.column` and
`rowActions.column` take a `SystemColumnDef` — `header`, `width`, `pinning`, `align`,
`headerClassName`, `cellClassName` — in the column vocabulary and with the column
scalar-or-object forms. Labelling the actions column, widening it or unpinning it on a narrow
grid had no route through the public API. The expand column is now pinned left like the selection
column beside it; it was the one system column pinned nowhere, so a horizontally scrolled grid
kept the checkbox and lost the chevron of the same row.

**`ResolvedGridOptions` stops inventing third names.** `pagination.pageSizer` →
`pagination.toolbar`, the word every other feature's resolved auto-mount flag uses;
`columnPinning: boolean` → `pinning: { column, row }`, so a kit can read the row axis at all.

**Column-level `filtering.debounce`,** overriding the table-level one — `editing.debounce` and
`creating.debounce` have always existed at both levels.

**Exports.** `ColumnInputRenderer` (the slot type `filtering` / `editing` / `creating`
components are declared with, whose JSDoc tells you to annotate them), `SystemColumnDef`,
`ColumnCellMeta`, `FilterOperator`, `FilterOperatorId`, `SELECT_BADGE_OPERATORS`,
`EMPTY_OPERATORS`, `BOOLEAN_OPERATORS`, `BuiltInGlobalFilterFn`, `GlobalFilterFnId`,
`ColumnFormMode`, `resolveColumnFormConfig` and `GridDeletingComponents` are now public.
`mapColumns`, `buildOperatorRegistry` and `resolveColumnOperators` are not — they are adapter
internals. `CellViewProps` is now an alias of the core `CellViewCtx` rather than a second
declaration of the same three fields.

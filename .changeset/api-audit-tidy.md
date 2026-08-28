---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

**Breaking:** the rest of the second API audit — exports, closed sets, and two either/or types.

- **`column.filtering.component` gets the `config` it was already being handed.** The runtime has
  always passed the column's `cell.config` to a custom filter input; the type declared only
  `{ value, onChange }`, so a custom filter for a `select` column could not read the very `items`
  the column was declared with without a cast. `InputComponentProps<TConfig>` now carries it, and
  the React adapter's `CellInputProps` is an alias of it rather than a second hand-written copy.
- **`pagination.threshold` is a real either/or.** `{ rows }` drives the virtualized detection path
  and `{ px }` the `IntersectionObserver` one, so only ever one is consulted — but both keys
  compiled, and which one did nothing depended on whether virtualization was on. It now uses the
  `?: never` arms its sibling `PaginationTotals` already used, exported as `LoadMoreThreshold`.
- **Two more closed sets get their const half** (`.claude/rules/typescript/coding-style.md`):
  `BuiltInCellType` and `BuiltInSortingFn` were bare unions. `BASE_CELL_TYPE_IDS` is now derived
  from `BuiltInCellType` rather than re-listed, with a compile-time proof that the members and
  `BaseCellTypes`' keys are the same set in both directions.
- **One sort-direction type.** `SortIndicatorProps.sortDir: SortDirection | false` and
  `DataGridHeaderCellRenderArgs.sortDirection: HeaderSortDirection` were two spellings of one fact
  on two public surfaces. Both are now `sortDirection: ColumnSortDirection` (`asc` / `desc` /
  `none`); `SortDirection` stays the two-member set for a direction someone _picks_, which is a
  different question. `HeaderSortDirection` is gone.
- **The kit factory's defaults key is `defaults`**, matching the provider prop it sits under —
  `createDataGrid({ defaults })`, not `defaultOptions`.
- **Exports.** Added: `ColumnRenderer` and `ExoticComponentLike` (named by every public renderer
  slot, previously unnameable), `DATA_GRID_DEFAULTS` (referenced from public JSDoc and a whole
  docs page, previously not exported). Removed: the six `Normalized*` config types, which are this
  package's plumbing and had zero uses outside it, and `defaultComponents`, whose type claimed a
  complete registry while the value held nothing — spreading it typechecked and then crashed.

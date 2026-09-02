# @ez-kit/data-grid-shadcn

## 0.2.0

### Minor Changes

- 9707040: Share the between-filter behaviour across UI kits, and fix two drifted spots.

  `@ez-kit/data-grid-react` now exports `useBetweenValue` (branch selection, slider bounds,
  `NaN`-safe number handlers, preset gate) and `buildMultiSelectLabel` (the multi-select trigger
  label). Both kits' `BetweenInput` / `MultiSelectFilter` render against them, so this behaviour
  is defined once instead of per kit.

  Fixes carried by the move:
  - **shadcn**: the between filter's number inputs now honour the column's `min` / `max`. They
    had silently dropped both, so values outside the configured range were accepted there while
    the heroui kit rejected them.
  - **heroui**: the pagination label and the infinite-scroll load-more row were styled with
    `text-default-500`. HeroUI v3 has flat `--muted` / `--default` tokens and no `default-500`
    step, so the utility compiled to nothing and neither element was actually muted. Both now go
    through the kit's `var(--muted)` convention.

  The shadcn calendar range picker now publishes only a **complete** range. react-day-picker
  resolves the first click to a same-day range (`addToRange` returns `{ from: day, to: day }`
  while `min` is 0), so the previous code applied a one-day filter on the way to the range the
  user was drawing — and fired a request for it on a server-driven grid. The first click is now
  held locally and the filter is written once the second click closes the range, matching the
  heroui kit, where react-aria keeps the same pending anchor internally.

- fe267fa: One activation verb across the UI-kit contract, and two casts removed from the HeroUI core blocks.

  **Breaking: `ClearFiltersButtonComponentProps.onPress` is now `onClick`.** It was the only
  activation handler in the contract spelled `onPress`; every sibling uses a semantic verb
  (`onClear`, `onRemove`) and `ChevronProps` already used `onClick`. React Aria — and through it
  HeroUI v3 — accepts `onClick` as an official alias of `onPress`, so a kit that wants to keep
  pressing through React Aria still can: the HeroUI kit wires `onPress={onClick}`. A kit
  implementing this component renames the prop; nothing else changes.

  **HeroUI `Button` no longer fakes a MouseEvent.** It used to wire `onPress` and cast the
  React Aria `PressEvent` to a React `MouseEvent` before handing it to the contract's handler —
  an object with neither `currentTarget` nor `preventDefault`, typed as if it had both. `onClick`
  is now forwarded straight through, so the handler receives the real synthetic event it is typed
  for. Covered by tests for pointer activation, keyboard activation and the `disabled` mapping.

  The remaining cast in `Button` and `Input` is narrowed from `as unknown as` to a plain `as`,
  with a comment: it exists only because react-aria-components declares its optional props
  without `| undefined`, which `exactOptionalPropertyTypes` rejects. The two shapes agree on
  every prop name and value type.

- ed0250e: Give every remaining closed set in the data-grid a named `const` object, matching the fourteen
  that already had one (`ColumnAlign`, `ColumnPinSide`, `ExpandingMode`, `RowActionsVariant`, …).

  **No consumer code changes.** Each set is a `const` object **plus** a same-named union of the
  bare literals, so `resizing: { mode: 'onEnd' }`, `filtering: { variant: 'popover' }`,
  `pagination: { mode: 'infinite', trigger: 'manual' }` and `validateOn: 'blur'` compile exactly
  as before and still need no import — a TS `enum` would have broken all four, which is why these
  are const objects. The named members are additive: a new way to write the same values, for
  anyone who prefers `ColumnResizeMode.OnEnd` to the string.

  New from `@ez-kit/data-grid-core`: `MultiSortEvent`, `ColumnResizeMode`, `ColumnResizeDirection`,
  `LoadMoreDirection`, `PaginationMode`, `ColumnSortUndefined`, `BadgeVariant`, `SystemColumnType`,
  `ValidateOn`, `CommitStatus`, `DraftAxis`, `BetweenInputVariant`, `BetweenInputType`.

  New from `@ez-kit/data-grid-react`: `SortDirection`, `HeaderSortDirection`, `FilterChipKind`,
  `FilteringVariant`, `FilterChipsPosition`, `LoadMoreTrigger`.

  Three props that spelled a set out inline now name it, so a kit can switch on the same symbol
  the grid writes: `ThProps.pinned` / `TdProps.pinned` are `ColumnPinSide | false`,
  `SortIndicatorProps.sortDir` is `SortDirection | false`, and `LoadMoreRowProps.trigger` is
  `LoadMoreTrigger`. `PaginationConfig.mode` and `BetweenOperatorConfig.variant` gained names for
  sets that previously had none. All are the same string literals as before.

  `ColumnSortUndefined`'s const half carries only the two named members (`First`, `Last`); the
  union keeps its `-1 | 1 | false` arms, which are TanStack's raw numbers and the absence of any
  placement — neither is a named position.

- ed0250e: Close the gaps a fourth pass over the public API turned up. Breaking, and pre-1.0, so it ships
  as a minor.

  **A column's input slots now hand you a typed `config`.** `filtering.component` and
  `editing.component` / `creating.component` always received the column's `cell.config`, but the
  slot's type rejected the annotation that would name it — so reading `config.items` on a `select`
  column meant a cast. The slots are declared through the new `ColumnInputRenderer`, whose props
  compare bivariantly, so `(props: InputComponentProps<SelectCellConfig>) => …` is accepted.
  `FieldState` also gained a `TValue` parameter, bound from the column's `accessorKey`: an edit
  field on a `number` column sees `value: number`.

  **One name per prop shape.** `CellInputProps` is gone. It was exported, documented as the type a
  registered cell type's `filter` slot receives, and used by nothing — those slots take
  `FieldState`. A column's own `filtering.component` keeps the smaller `InputComponentProps`.

  **Renames, one concept one word:**
  - `Toolbar.left` / `Toolbar.right` → `Toolbar.start` / `Toolbar.end`. The bar is a flex row, so
    the slots swap sides under RTL; `align`'s logical vocabulary applies, `pinning`'s physical one
    does not.
  - `editing.validateDebounceMs` / `creating.validateDebounceMs` → `debounce`, at both the table
    and the column level, matching `filtering.debounce` and `globalFiltering.debounce`.
  - `pagination.pageSizeOptions` → `pagination.items` — the word this API already spends on "the
    values a control offers", and the name of the `PageSizerProps.items` it feeds.
  - `LoadMoreRowProps.hasMore` and `InfiniteController.hasMore` → `hasNextPage`, matching the
    `pagination.hasNextPage` option they carry.
  - `ClearFiltersButtonComponentProps` → `ClearFiltersButtonProps`, matching every other kit
    contract.
  - `<DataGrid.SortTrigger>` → `<DataGrid.SortMenuTrigger>` (with `DataGridSortMenuTriggerProps` /
    `…RenderArgs`). It mounts the kit's `SortMenu`; the name now matches both that and the
    `data-slot="sort-menu-trigger"` the kits already emit, and no longer collides with the header's
    per-column `data-slot="sort-trigger"`.
  - `resizing.direction` → the root `direction` option, with `ColumnResizeDirection` renamed
    `GridDirection`. Text direction is a fact about the grid, not a resize setting, and it now
    applies whether or not resizing is enabled.

  **`enabled` reaches nested configs.** `pinning.column`, `pinning.row`, `virtualization.row`,
  `deleting.confirmation`, `deleting.bulk.confirmation`, `selection.bar`, `filtering.chips`,
  `filtering.toolbar` and the three `fallbacks.*` entries all take the shared feature toggle, so a
  config that arrived from a defaults layer can be switched off for one grid without restating it.

  **`filtering.chips` takes the scalar form** — `chips: 'below'` alongside the object, the same
  shape as a column's `align`, `width` and `pinning`.

  **`DATA_GRID_DEFAULTS` is complete.** It now carries every default value under its option path —
  sorting, selection, expanding, resizing, virtualization, row actions, editing, creating, layout,
  the `link` cell target and the grid direction — with the core-owned numbers re-exported from
  `@ez-kit/data-grid-core` (`DEFAULT_VALIDATE_DEBOUNCE_MS`, `DEFAULT_ROW_ESTIMATE_SIZE`,
  `DEFAULT_ROW_OVERSCAN`) rather than restated. The docs' "Default Values" page matches it.

  **`data-slot` on the fallback rows.** `EmptyStateRow` and `NoResultsRow` rendered
  `<Tbody><Tr><Td>` with no slot at all, so the structural stylesheet's rules applied to the
  loading body and not to them; both now mirror `LoadingBody`. The kits' `Pagination` and
  `PageSizer` gained `data-slot` too.

- f92d88b: Close the gaps a fifth pass over the public API turned up. Breaking, and pre-1.0, so it ships as
  a minor.

  **`visibility.onChange` and `expanding.onChange` now fire.** Both were typed, documented and
  re-exported on their `React*` config — and both were dropped before reaching the core. The React
  layer rebuilt those two feature configs with an **allowlist**, picking the core fields by name, so
  anything it had not heard of vanished: a grid that asked to be told when a column was hidden, or
  when a row was expanded, was never told, and nothing failed. `visibility` was collapsed all the
  way to `isFeatureEnabled(visibility)`. Both splits are strips now — take the config, remove the
  React-only key, pass the rest — which is what `selection` and `globalFiltering` already did, and
  `globalFiltering`'s own comment had already recorded the lesson. `feature-on-change.test.tsx`
  covers every feature's `onChange` end to end so the class of bug cannot come back quietly.

  **`table.grid.visibility` and `table.grid.sorting` are resolved values.** They were the raw
  `boolean | Config` union — alone among the fields of `ResolvedGridOptions`, whose entire purpose
  is that nobody re-derives what the grid already decided. Every reader, the built-in `Toolbar`
  included, had to repeat `cfg === true || (typeof cfg === 'object' && Boolean(cfg.toolbar))`. Both
  are now `NormalizedFeatureToolbarConfig | undefined` — `{ toolbar: boolean }` when the feature is
  on, `undefined` when it is off. Behaviour is unchanged: `visibility: true` still auto-mounts the
  Columns toggle and the object form still needs `toolbar: true`.

  The shapes `ResolvedGridOptions` is built from are exported too — `NormalizedFeatureToolbarConfig`,
  `NormalizedFilterChipsConfig`, `NormalizedFilteringToolbarConfig`, `NormalizedGlobalFilteringConfig`,
  `NormalizedInfiniteConfig`, `NormalizedPageWindowConfig`, `NormalizedVirtualizationConfig`. The
  type is public and a UI kit reads it through `useGridOptions()`, so the names of its members had
  to be nameable.

  **`PendingCount` is keyed by `DraftAxis`.** `DraftAxis`'s contract has always said an axis
  doubles as the key into `AppliedState` and `PendingCount`; it was true of the first and not the
  second, which spelled the same three axes `sorting` / `filters` / `search` — so
  `pending[DraftAxis.ColumnFilters]` was a type error and one axis answered to three words across
  the state slice, the count and the table option. The keys are now `sorting` / `columnFilters` /
  `globalFilter`, and `globalFilter` counts (`0` or `1`) rather than flagging, so the three fields
  share a type. `DraftBarProps.pending` is the core `PendingCount` verbatim instead of a
  hand-written twin, and the kits' bars emit `data-pending-column-filters` /
  `data-pending-global-filter`.

  **Deleting owns a state slice, like the other two write features.** `state.pendingDeleteRowId`
  and `state.pendingBulkDelete` — two flat keys on `TableState`, neither named for the feature —
  are now one `state.deleting: { pendingRowId, pendingBulk }`, matching `state.editing` and
  `state.creating`. `table.deleting.getState()` joins `table.editing.getState()` and
  `table.creating.getState()`, so the three write features read the same way their shared API doc
  already claimed. `initialState` forbids the `deleting` slice, as it already forbade the two keys
  it replaces.

  Migrating: `useDataGridState((s) => s.pendingDeleteRowId)` → `(s) => s.deleting.pendingRowId`,
  `s.pendingBulkDelete` → `s.deleting.pendingBulk`.

  **`ColumnMeta.columnPinning` / `columnAlign` → `pinning` / `align`.** Every other entry in the
  meta augmentation is named for the column option it carries (`filtering`, `editing`, `creating`,
  `visibility`); these two were not, so one concept answered to two words depending on whether you
  were writing the column or reading its meta — and `meta.columnPinning` read like TanStack's
  `state.columnPinning`, which is a different thing (the pinned-id lists, untouched here).

  **Docs corrected against the types.**
  - `initialState.pagination` was documented as replacing the whole pagination slice and silently
    overriding `pagination.pageSize`. It seeds **per key**: a deep link to page 3 is
    `{ pageIndex: 2 }` and nothing more, and the omitted `pageSize` keeps the one the option set.
    The old text told authors to restate a `pageSize` they had no opinion about — which is exactly
    how a page opens on a size nobody asked for.
  - The Column Visibility page said the feature "has no dedicated `onChange`". It has one (it just
    did not work — see above), and the page now documents it, along with `visibility.toolbar`.
  - The pagination options table gained `pagination.toolbar` and `pagination.pageCount`, and no
    longer calls `rowCount` "required" under `manual` — `pageCount` is the alternative, and the
    type forbids both.
  - Fixed a mangled source link on the Column Visibility page and two JSDoc sentences whose
    "it was `X`" named the new name rather than the old one.

- a132c57: Close eight defects the sixth API audit turned up.

  **`selection.column` sees the real row type.** `ReactSelectionConfig` was declared as
  `SelectionConfig & { bar }`, dropping the type argument, so a replacement select-all header was
  handed `HeaderContext<object>` and `row.original.name` did not compile. `expanding.column` and
  `rowActions.column` had always passed it.

  **One node vocabulary across the three system columns.** `RowActionsConfig` spent a single type
  parameter on two unrelated things — a menu entry's `icon`, which needs an element, and
  `column.header`, which is column-header content and must accept a string like any other header.
  It is now `RowActionsConfig<TRow, TIcon, TNode>`, with `TIcon` in the position the old single
  parameter held, and `SelectionConfig` / `ExpandingConfig` gained the same `TNode`. Under React
  all three now type `column.header` as `ReactNode`, where selection and expanding previously
  checked nothing at all and row actions rejected `() => 'Actions'`.

  **Delete prompts see the row.** `ConfirmationConfig` / `BulkConfirmationConfig` are generic over
  the row type, so ``description: (row) => `Delete "${row.original.name}"?` `` needs no cast — the
  casts are gone from the docs examples.

  **Compound render arguments can be typed.** `<DataGrid.Body>`, `Table`, `Header`, `HeaderRow`,
  `HeaderCell`, `Row`, `Cell` and `Footer` take an optional row type argument —
  `<DataGrid.Body<Order>>` — and their `*Props` / `*RenderArgs` types are generic to match. The
  default is unchanged, so nothing has to be updated.

  **`<DataGrid.FooterRow>` and `<DataGrid.FooterCell>`.** The footer had no per-row or per-cell
  slot, so changing one footer cell meant hand-writing a `<td>` and re-deriving `colSpan`, the
  pinning offset, `align.footer` and `footerClassName`. These are the footer's counterparts to
  `HeaderRow` / `HeaderCell`, and the default footer is now built from them.

  **`SystemColumnDef.footerClassName`.** The three system columns could set `align.footer` but not
  the class beside it, though the default `<tfoot>` renders a cell for every column.

  **`ColumnMeta.filtering` carries the whole feature.** The resolved filtering config was five flat
  keys next to it — `filteringItems`, `facetedEnabled`, `defaultOperatorId`, `resolvedOperators`,
  `betweenOperatorConfig` — so `filtering.items` was read back as `meta.filteringItems`. They are
  now `meta.filtering.items` / `.faceted` / `.defaultOperator` / `.operators` / `.betweenOperator`,
  each named for the column option it holds, typed as the new `ColumnFilteringMeta`.

  **Docs: column and row pinning do have an `onChange`.** Both pages stated they do not, while
  `pinning.column.onChange` and `pinning.row.onChange` are wired and fire.

- a132c57: Close ten defects the seventh API audit turned up.

  **`align` reaches body and footer cells in every kit.** The structural stylesheet emitted
  `text-align` alone, which does nothing inside a cell a kit lays out with flex — shadcn's
  `<TableCell>` is `flex items-center` — so `align: 'end'` right-aligned a column's header in both
  kits and its values in only one of them: a numeric column with a total came out with the header at
  one edge and every value and the total at the other. The alignment rules now carry
  `justify-content` beside `text-align`, exactly as the header's `sort-trigger` rules already did.
  `justify-content` is inert on a block box, so kits that keep their cells as blocks are unchanged.

  **The selection bar and the three fallbacks are resolved like every other option.**
  `table.grid.selection.bar` was the raw `boolean | SelectionBarConfig` union and `grid.fallbacks`
  the raw `FallbacksConfig` — the last two options on `ResolvedGridOptions` that a reader had to
  settle for itself, which three components and four components respectively did. They are now
  `NormalizedSelectionBarConfig` (`variant` settled, `undefined` when the bar does not render) and
  `NormalizedFallbacksConfig` (all three states present with a settled `enabled`). A UI kit reading
  `useGridOptions()` could not have derived the bar's variant at all: its default lives in a
  constant the package does not export.

  **`selection.bar` takes the scalar its neighbours take.** `bar: 'inline'` — the render mode being
  the whole of what the option usually says — beside `filtering.chips: 'below'` and a column's
  `align` / `width` / `pinning`.

  **`visibility`'s two forms agree.** The object form defaulted `toolbar` to _off_ while the bare
  `true` defaulted it _on_, so adding an `onChange` to a working `visibility: true` silently removed
  the only control the feature has. Both forms now mount it; `toolbar: false` opts out. The rule
  across the config is that a feature's object form defaults `toolbar` exactly the way its bare
  `true` does — what that default _is_ still differs per feature, and deliberately.

  **Resolved options are keyed by the option path.** `grid.pagination.window.{siblings,boundaries}`
  is now `grid.pagination.{siblings,boundaries}`, and the top-level `grid.infinite` is
  `grid.pagination.infinite` — the options are `pagination.siblings`, `pagination.trigger` and so
  on, and `DATA_GRID_DEFAULTS` already keys them that way. Same defect as the `pageSizer` → `toolbar`
  rename before it. `NormalizedPageWindowConfig` is gone with the nesting.

  **`GridComponentsProviderProps` and `CellTypesProviderProps` are exported.** Both were declared and
  neither was reachable, so two of the three providers had props nobody could name.

  **`<CellTypesProvider cellTypes>`.** It was `types`, the one place the registry was not called
  `cellTypes` — `useDataGrid({ cellTypes })`, `<DataGrid cellTypes>`, `createDataGrid({ cellTypes })`
  and `ResolvedGridOptions.cellTypes` all agreed with each other and not with it.
  `CreateDataGridOptions.components` drops a redundant `Partial<>`, matching the two other places
  `GridComponents` is passed.

  **The pending draft can be persisted.** `extractState` reads the internal state, where the three
  deferred axes hold what the user is still composing — so a persisted view fed back through
  `initialState.sorting` restored the draft _already applied_, the one thing `draft` exists to
  prevent. `'draft'` is now a persistable key (opt-in, not in `DEFAULT_STATE_KEYS`) reported under
  the name `initialState.draft` reads it back under.

  **`DATA_GRID_DEFAULTS` keys are option paths again.** `layout.virtualHeight` and `cell.link.target`
  were defaults for options that do not exist; they are `layout.maxHeight.{default,virtualized}` and
  `cell.config.target` — the path the docs' defaults table already printed.

  **Docs: three drifts prose-only checks could not catch.** `production.mdx` documented
  `getPendingCount()` as `{ sorting, filters, search }` (the keys that were replaced by the
  `DraftAxis` ones); `createDataGrid`'s JSDoc still registered a cell type with an `edit` slot,
  renamed to `editing`; and `composition.mdx`'s `<DataGrid.HeaderCell>` table omitted `resizer`, so a
  custom header cell written from it lost the resize handle.

- 2f7c40d: Settle the data-grid public API so it stops moving. Breaking, pre-1.0 so shipped as a minor.

  **One vocabulary for options.**
  - Column `visibility` flips from `true | { … }` to `false | { … }` — `false` now turns hiding
    off for that column, matching every other per-column switch (`sorting`, `filtering`,
    `editing`, `resizing`).
  - Column `globalFilter` becomes `globalFiltering?: false`, and the table option `sizing` /
    `SizingConfig` becomes `resizing` / `ResizingConfig`. Names now match across levels.
  - `editing.variant` and `creating.variant` become `mode` (`EditingVariant` / `CreatingVariant`
    → `EditingMode` / `CreatingMode`). The rule from here: `mode` changes behaviour, `variant`
    changes layout only — so `rowActions`, `filtering`, `pagination` and `selection.panel` keep
    `variant`.
  - Every feature option reads the same way: `false`/omitted is off, `true` is on with defaults,
    an object is on **and** configured. New `enabled: false` keeps the settings while switching
    the feature off — what a shared defaults layer needs.
  - `toolbar` is the single word for auto-mounting a feature's control.
    `filtering.clearButton` → `filtering.toolbar` (`FilterClearButtonConfig` →
    `FilteringToolbarConfig`), and `pagination.toolbar` is new — `pageSizeOptions` is data again
    rather than a hidden switch. Omitting it preserves the current one-field behaviour.
  - `filtering.debounce` is the shared timing for every text filter and defaults to `250` (was
    `0`); `globalFiltering.debounce` falls back to it instead of carrying a second default.

  **Types and exports.**
  - `ReactExpandingConfig` collapses to `ExpandingConfig<TRow, ComponentType<…>>` — it was the
    one React config restated by hand, so the one guaranteed to drift.
  - `shadcn` and `heroui` now export their own `createColumns` / `createColumnHelper`. They were
    falling through to the headless versions, typed `TCustomCellTypes = never`, which compiled
    while silently not checking a column's custom `cell: { type: … }`.
  - New `useGridOptions()` and `ResolvedGridOptions`: the grid's resolved decisions — filter
    variant, debounce, which controls auto-mount — are now readable by a UI kit or a custom
    compound child, instead of living behind eighteen private `Symbol()` keys.

  **Composition.**
  - `<DataGrid.Footer />` renders a `<tfoot>` from each column's `footer`. Not in the default
    layout; place it inside a custom `<DataGrid.Table>` body.
  - `<DataGrid.Header>` accepts `children` (element or render function), so a custom header row
    no longer costs pinning, sticky positioning and virtualization.
  - `Tfoot` joins the core UI-kit contract — breaking for an external kit registered with
    `satisfies FullGridComponents`.
  - `Pagination`, `SelectionBar`, `SortTrigger`, `ColumnVisibilityTrigger` and `FilterPanel`
    take `children` as a render function receiving the model each already derives — the page
    totals with their trusted/unknown distinction, a confirmation-aware `onDelete`, the
    per-entry sort column lists, and each column's ready-made filter input. These are the
    derivations that are expensive to repeat and easy to get subtly wrong outside the grid.
    The slots that only forward to a kit component (`PageSizer`, `DraftBar`, the modals, the
    fallback rows) deliberately get nothing: they are already overridable through the kit
    registry, and for the fallbacks through `fallbacks.*.content`.
  - `DataGridRowProps` and `DataGridCellProps` are exported — writing a wrapper around
    `<DataGrid.Row>` was possible, naming its props was not.

- 7c3ca6a: Fix the toolbar Sort button stretching, and de-duplicate the kit blocks.

  **Breaking (DOM contract):** the toolbar's `SortMenu` trigger now carries
  `data-slot="sort-menu-trigger"` instead of `data-slot="sort-trigger"`. It collided with the
  column header's sort trigger, so the shared structural stylesheet's unscoped
  `[data-slot='sort-trigger'] { flex: 1 }` rule stretched the toolbar button across the toolbar's
  right group. Restyle against the new name if you were targeting that button.

  Internals, no visual change: `EmptyState` / `NoResultsState` now share a `StatePlaceholder`,
  `ActionsCell` / `CreatingActionsCell` share a `SaveCancelButtons` pair, and the dropdown icons
  for both menus moved into a per-kit `blocks/icons.tsx`.

- d709ff3: Make `cell.type` actually type-checked, group the layout options, and rename `virtualized`.
  Breaking, pre-1.0 so shipped as a minor.

  **`cell.type` is checked against the kit's registry again.** The `TCustom` parameter on `CellDef`
  was decorative: two independent defects cancelled it out. `CellType` carries a `(string & {})`
  tail, and `SimpleType` was derived from it with `Exclude`, which does not remove that tail — so
  `BasicCellDef` accepted every string no matter what was registered. On top of that both kits
  exported their registry as `export const cellTypes: CellTypeRegistry`, whose widening annotation
  collapsed the key union to `string`, so the bound `createColumns` was typed
  `ColumnDef<TRow, string>`. A typo like `cell: { type: 'raiting' }` compiled cleanly in every kit.

  `BuiltInCellType` (new, exported) is now the closed union and `SimpleType` derives from it;
  `CellType = BuiltInCellType | (string & {})` stays for `ColumnMeta`, where looseness is correct.
  Both kits export their registry with `satisfies`.

  Migration: a `cell.type` that no kit registers is now a compile error. Columns written inline into
  `useDataGrid({ columns })` are unaffected (`TableConfig.columns` is `ColumnDef<TRow, string>`).
  For the unbound `createColumns`, which cannot know a registry supplied at runtime through the
  `cellTypes` prop, name the types you mean: `createColumns<Row, 'money' | 'rating'>([…])`.

  **`stickyHeader` → `layout`.** The one presentational flag sitting among the feature toggles now
  lives in its own group, together with a `maxHeight` that had no API at all: it writes
  `--dg-table-max-height`, or `--dg-virtual-height` under virtualization, both of which previously
  had to be set on a parent element by hand.

  ```diff
  -useDataGrid({ data, columns, stickyHeader: true })
  +useDataGrid({ data, columns, layout: { stickyHeader: true, maxHeight: '32rem' } })
  ```

  `<DataGrid.Header stickyHeader>` is unchanged — it still overrides the grid option for one header.

  **`virtualized` → `virtualization`**, so it reads as a noun beside `pagination` / `selection` /
  `filtering`. `VirtualizedConfig` → `VirtualizationConfig`, `NormalizedVirtualizedConfig` →
  `NormalizedVirtualizationConfig`, `ResolvedGridOptions.virtualized` → `.virtualization`.

  **`initialState.pagination` seeds per key.** It is typed `Partial<PaginationState>` instead of
  TanStack's both-keys-required `PaginationState`, and merges into the resolved slice rather than
  replacing it. Seeding a deep link with `{ pagination: { pageIndex: 3 } }` no longer forces the
  caller to restate a `pageSize` it has no opinion about — and restating it wrong no longer silently
  overrode `pagination.pageSize`.

  **Fixed:** `createColumnHelper().date()` / `.image()` / `.progress()` and the registered-type
  helpers built `{ config: undefined }`, which is invalid under `exactOptionalPropertyTypes`. It
  only ever compiled because the over-wide `BasicCellDef` absorbed the shape.

- a132c57: data-grid: a column's `footer` now renders

  `column.footer` was the one column option that did nothing on its own — it reached TanStack,
  `<DataGrid.Footer />` could render it, and the default layout mounted neither, so a column
  declared a footer and nothing appeared. Declaring it is now enough, the way declaring `align` or
  `pinning` is.
  - **`layout.footer`** — omitted, the footer row mounts when at least one column declares a
    `footer`; `false` opts out (the way a grid drops a footer its shared columns declare under a
    defaults layer); `true` mounts it before any column declares one, for a `<DataGrid.Footer>`
    whose `children` supply the content.
  - **`layout.stickyFooter`** — keeps the totals row in view while the body scrolls, mirroring
    `layout.stickyHeader`. `<DataGrid.Footer>` takes a `sticky` prop, as `<DataGrid.Header>` does.
  - Both kits now lay the footer out in the column grid. shadcn's vendored `<TableFooter>` never
    got the `display: block` its header and body have, so the footer shrink-wrapped to a third of
    the table's width; HeroUI's table is a React Aria collection, which dropped the `<tfoot>`
    entirely — the kit now lifts it out of the collection and renders it into the real `<table>`.

  No behaviour changes for a grid whose columns declare no `footer`, and a hand-composed
  `<DataGrid.Table>` body still mounts only what you put in it.

- d709ff3: One `onChange` rule for every feature, and a fix for the selection callback that disabled
  selection. Breaking, pre-1.0 so shipped as a minor.

  **`selection: { onChange }` used to break row selection entirely.** The callback was carried by
  TanStack's `onRowSelectionChange`, which _replaces_ the built-in state writer (`makeStateUpdater`)
  rather than running beside it — so the handler fired, nothing was ever written to
  `state.rowSelection`, and every checkbox went dead. The existing test passed throughout because it
  only asserted that the callback fired. Selection now goes through the same state funnel as every
  other feature, and the suite asserts the state as well as the call.

  **Every feature with a slice in `TableState` now has an `onChange` taking that slice.** New:
  `columnVisibility.onChange`, `pinning.column.onChange`, `pinning.row.onChange`,
  `resizing.onChange`, `expanding.onChange`. Persisting or mirroring any of them no longer means
  subscribing to `onStateChange` and diffing by hand.

  Pinning groups two independent features over two slices, so each sub-config carries its own
  callback — `pinning: { column: { onChange } }` / `pinning: { row: { top: true, onChange } }` —
  rather than the group carrying one callback for both. `resizing.onChange` reports `columnSizing`
  only; `columnSizingInfo` churns on every pointer move mid-drag.

  `columnVisibility` accordingly widens from `boolean` to `boolean | ColumnVisibilityConfig`, and
  the React layer's `ColumnVisibilityUIConfig` now extends it.

  **`selection.onChange` signature.** The slice comes first, like everywhere else; the selected ids
  follow as a convenience:

  ```diff
  -selection: { onChange: (rowIds) => … }
  +selection: { onChange: (rowSelection, rowIds) => … }
  ```

  **`sorting.removable` → `sorting.clearable`.** `MultiSortConfig.removable`, one level below, means
  something else — removing a _column_ from the multi-sort set. Two behaviours under one word is how
  a config gets misread; the table-level one is now named for what it does.

  **`pagination`: `rowCount` and `pageCount` are a real either/or.** "Supply one, not both" lived
  only in a JSDoc sentence. `PaginationTotals` (exported) makes supplying both a compile error.

- d709ff3: Finish the composition ladder in the header, and stop interactive header content from sorting.

  **`DataGrid.HeaderRow` and `DataGrid.HeaderCell`.** `DataGrid.Header` took `children` and nothing
  else, so giving one column a header of its own meant replacing the whole header and
  re-implementing sorting, the column menu, resizing, the inline and popover filters, pinning and
  the selection column — for every column. The body got `Row` / `Cell` for exactly this; the header
  now has the matching pair.

  ```tsx
  <DataGrid.Header>
  	{({ headerGroups }) =>
  		headerGroups.map((group) => (
  			<DataGrid.HeaderRow
  				key={group.id}
  				headerGroup={group}
  			>
  				{({ headers }) =>
  					headers.map((header) =>
  						header.column.id === 'status' ? (
  							<DataGrid.HeaderCell
  								key={header.id}
  								header={header}
  							>
  								…
  							</DataGrid.HeaderCell>
  						) : (
  							<DataGrid.HeaderCell
  								key={header.id}
  								header={header}
  							/>
  						),
  					)
  				}
  			</DataGrid.HeaderRow>
  		))
  	}
  </DataGrid.Header>
  ```

  `HeaderCell`'s render function hands back the default header's own parts — `label`, `sortTrigger`,
  `menu`, `filter`, `resizer` — so a custom cell keeps the ones it still wants instead of rebuilding
  them, and can place its own controls outside the sort affordance. They arrive as nodes rather than
  as four more exported components.

  **A button in `column.header` no longer sorts the column too.** The column's header content sits
  inside the sort affordance, because clicking a column's name to sort it is how every table works —
  but that meant any button, link or input placed there fired the sort as well, since the click
  bubbled straight into the handler. Clicks (and Enter/Space) originating on an interactive
  descendant are now ignored by the sort handler. Clicking the name still sorts.

  **Fixed in the HeroUI kit:** its `Thead` found the row-header column by walking the rendered JSX
  for a `data-column-id` prop, so it depended on the exact element shape the shared layer happened
  to produce. It now reads the first visible non-system column from the table model instead — the
  same column, but one a component boundary cannot hide.

- fe267fa: Settle the state-reading hooks, and stop `pagination.toolbar` from disabling a hand-placed PageSizer.

  **Hooks.** Four overlapping hooks with names that did not say what they did are now four with one job each, and the broad-subscription footgun is gone:
  - `useTable(selector?)` → **removed**. Its no-argument form subscribed to the entire `TableState`, so eighteen built-in components re-rendered on every keystroke in a filter box. Replaced by `useDataGridTable<TRow>()`, which reads the table and subscribes to nothing.
  - `useDataGridStore(selector)` → renamed **`useDataGridState(selector)`**. Same behaviour; the name now matches what it returns (a slice of state, not a store).
  - `useDataGridInstance<TRow>()` and `useDataGridTable<TRow>()` take an optional row type, so composing a custom body or a kit `ActionsCell` no longer erases `row.original` to `any`.
  - `useTableContext`, deprecated and unexported, is deleted.

  A component that needs both writes them together, and the subscription is now visible at the call site:

  ```tsx
  const table = useDataGridTable<User>()
  useDataGridState((s) => s.columnVisibility)
  ```

  `useDataGridState((s) => s)` is the explicit broad subscription where one is genuinely wanted.

  **`ActionsCellProps<TRow>`** takes an optional row type for the same reason; omitted, it behaves as before.

  **PageSizer.** `pagination: { toolbar: false }` documented that `<DataGrid.PageSizer />` still worked when placed by hand, but the resolver erased `pageSizeOptions` along with the auto-mount, so the hand-placed control rendered nothing. Mounting and data are now separate: `grid.pagination.pageSizer` governs whether the toolbar mounts it, `grid.pagination.pageSizeOptions` is resolved whenever page-based pagination is on — which also means a hand-placed PageSizer works under a bare `pagination: true`, falling back to the default size list.

  **Compound member prop types are exported**, matching their thirteen siblings: `DataGridActiveFiltersBarProps`, `DataGridClearFiltersButtonProps`, `DataGridCreateTriggerProps`, `DataGridGlobalFilterInputProps`.

- d709ff3: Mount custom renderers instead of calling them.

  `flexRender` invoked a renderer as `Comp(props)`. This package reimplements it because it depends
  on `@tanstack/table-core` alone, and the reimplementation dropped the one thing that matters:
  `@tanstack/react-table`'s own `flexRender` does `createElement(Comp, props)` and recognises the
  exotic wrappers via `$$typeof`.

  Calling a renderer gives it no fiber of its own, so its hooks land on the caller's. In
  `renderFilterInput` the branch taken depends on the selected operator, so switching operators
  reordered the hooks of whatever the previous branch had rendered and crashed the caller. It also
  meant `memo(...)` and `forwardRef(...)` — objects, not functions — were rejected outright, no cell
  could sit under its own error boundary, and none could be memoised.

  Every renderer is now mounted: `cell.component`, `filtering.component`, `editing.component`,
  `creating.component`, and all four registry slots (`view` / `edit` / `creating` / `filter`). They
  may use hooks, be wrapped in `memo` / `forwardRef` / `lazy`, and appear in React DevTools.

  `CellTypeDefinition`'s four slots are typed `ComponentType<Props>` rather than
  `(props) => ReactNode`, so the exotic wrappers pass the type check as well as the runtime one.
  Every plain function component still fits.

  One thing to know: a renderer's identity is now its component type, so a renderer rebuilt on every
  render remounts on every render — visible as a lost input focus. Column definitions already had to
  be stable for TanStack's sake; this makes an unstable one show up instead of merely wasting work.
  Build them with `createColumns` outside the component, or memoise them.

- d709ff3: Type-check what a column's renderers return.

  `header`, `footer`, `cell.component`, `filtering.component`, `editing.component` and
  `creating.component` all returned `unknown`. That is the honest type in core, which is
  framework-agnostic and never calls them — but it reached React unchanged, so a renderer could
  return anything at all, JSX inside one was unchecked, and there was no autocomplete.

  `ColumnDef` (and `CellDef`, `ColumnFilteringConfig`, `ColumnEditingConfig`,
  `ColumnCreatingConfig`, `createColumns`, `createColumnHelper`) take a `TNode` parameter,
  defaulted to `unknown`. `@ez-kit/data-grid-react` re-exports `ColumnDef` / `CellDef` /
  `ColumnHelper` / `createColumns` / `createColumnHelper` with `TNode` bound to `ReactNode`, and
  every kit inherits that through its bound factory. This is the same technique `ExpandingConfig`
  already used for `renderExpanded`, and for the same reason: a hand-written React twin of the
  column def could only ever drift out of sync with core.

  The slot type is `ColumnRenderer<TProps, TNode>` — a function returning `TNode`, **or** an
  `ExoticComponentLike` (`{ $$typeof: symbol }`), which is what `memo(...)` and `forwardRef(...)`
  produce. They already worked at runtime; now they typecheck too.

  Nothing to migrate: a renderer returning `ReactNode` still satisfies core's `unknown`, so React
  columns stay assignable to `TableConfig['columns']`. A renderer that was returning something
  which is _not_ a valid `ReactNode` becomes a compile error — which is the point.

- fe267fa: Type `cell.config` from the cell-type registry, so a kit-bound `createColumns` actually checks it.

  **The defect.** `CellDef` was a hand-written union of seven arms plus an open `custom` arm for project-registered types. The moment a kit registered a type under an id the union already had — which every kit does, since they all register `text`, `number`, `select`, … — the open arm swallowed it. The result was that the _unbound_ core helper checked cell configs strictly while the kit-bound one, the one every consumer actually calls, checked nothing:

  ```ts
  // @ez-kit/data-grid-core — rejected, correctly
  createColumns<Row>([{ accessorKey: 'status', cell: { type: 'select' } }])
  //                                                  ^ Property 'config' is missing

  // @ez-kit/data-grid-shadcn — the same code, silently accepted
  createColumns<Row>([{ accessorKey: 'status', cell: { type: 'select' } }])
  createColumns<Row>([{ accessorKey: 'qty', cell: { type: 'number', config: { anyTypoAtAll: 1 } } }])
  ```

  **The fix.** A cell type now declares the config it accepts, and the column type is derived from the registry rather than restating it:

  ```ts
  export const cellTypes = {
  	rating: defineCellType<{ max: number }>()({ view: RatingView, edit: RatingInput }),
  }
  ```

  `config` is then **required** on that type's columns when its config has a required field, **optional** when every field is optional, and **rejected** when the type declared no config — all derived, none of it written twice. Custom types get exactly the checking the shipped ones get, which is the reverse of the old behaviour: built-ins were checked and a project's own types were not.

  **Breaking changes**
  - `ColumnDef`, `CellDef`, `ColumnHelper`, `createColumns` and `createColumnHelper` take a **registry** as their cell-type parameter instead of a union of ids. `createColumns<Row, 'rating'>` becomes `createColumns<Row, typeof myCellTypes>`; a registry key union cannot carry each type's config, which is the whole point.
  - `createColumnHelper`'s runtime argument is the registry's ids (unchanged in shape). Omitted, it still yields the shipped contract's builders — `createColumnHelper<Employee>()` keeps answering to `.text()` / `.select()` / `.badge()`.
  - The builder now offers **exactly** the registered ids. Passing your own ids no longer also grants the built-in methods; spread `baseCellTypes` into your registry to keep them.
  - Cell types must be declared with `defineCellType` for their config to be recorded. A bare object literal still works as a registry, it simply declares no config.
  - `createColumnHelper(...).custom({ type, config })` stays the deliberately unchecked escape hatch for a type registered at render time via `<DataGrid cellTypes={…}>`.

  **New exports** — `defineCellType` and `CellTypeRegistry` from `@ez-kit/data-grid-react`; `baseCellTypes` from `@ez-kit/data-grid-react/cell-types`; `BaseCellTypes`, `BASE_CELL_TYPE_IDS`, `CellTypeRegistryShape`, `ConfigOf`, and the `TextCellConfig` / `NumberCellConfig` / `BooleanCellConfig` declarations from `@ez-kit/data-grid-core`.

  `@ez-kit/data-grid-shadcn`'s `src/index.test.ts` locks the behaviour with `@ts-expect-error` assertions, so a regression fails `pnpm typecheck` rather than passing silently.

- d709ff3: Let a grid style and compose individual rows and cells. Purely additive.

  **`rowProps`** resolves DOM props per row and forwards them to the kit's `Tr`:

  ```tsx
  useDataGrid({
  	data,
  	columns,
  	rowProps: (row) => (row.original.status === 'failed' ? { className: 'bg-red-50' } : undefined),
  })
  ```

  "Highlight the failed rows" — the most ordinary request a table gets — had no route through the
  API. Replacing the kit's `Tr` reaches every row and knows nothing about the data; a
  `<DataGrid.Body>` render function reaches the data but gives up pinned rows, expanded panels, the
  creating row, the fallback states, the infinite footer and the refetch overlay along with the
  default body. Structural attributes (`data-slot`, `data-row-id`, `data-depth`, `data-pinned`,
  `data-virtual`) are applied after the consumer's and win; `className` and `style` are merged.

  **Column class names** — `headerClassName`, `cellClassName`, `footerClassName` on `ColumnDef`.
  `cellClassName` also takes a per-cell function, so it can key off the value or the row:

  ```ts
  { accessorKey: 'balance', cellClassName: ({ value }) => (Number(value) < 0 ? 'text-red-600' : undefined) }
  ```

  Three names rather than one `className`, because a single field would have to mean "header and
  cells alike" — right-alignment wants both, a value-driven highlight only the cells.

  **`<DataGrid.Row>` and `<DataGrid.Cell>` take children**, as `ReactNode` or a render function
  (`{ row, cells }` and `{ cell, row, value }`). The composition ladder stopped at
  `<DataGrid.Body>`: overriding anything below it meant rebuilding the row and cell shells by hand,
  losing the pinning offsets, the structural attributes and the column classes the stylesheet
  targets. Both slots keep their shell and replace only the content.

  New exported types: `RowPropsResolver`, `LayoutConfig`, `DataGridRowRenderArgs`,
  `DataGridCellRenderArgs`.

- a132c57: Make the data-grid packages importable from a Next.js App Router server component, and make the
  optional `zod` peer genuinely optional.

  **`'use client'` now survives the build.** The directive was written on 87 source files, and every
  one of them was an _inner_ module — tsup bundles each package into a single file and only keeps a
  directive that sits on the **entry**, so not one reached `dist`. Importing `DataGrid` from a server
  component therefore failed. `@ez-kit/data-grid-react`, `@ez-kit/data-grid-shadcn` and
  `@ez-kit/data-grid-heroui` now carry it on `src/index.ts`. `@ez-kit/data-grid-core` deliberately
  stays unmarked: it contains no React, so `createTable` and the operator/cell-type constants remain
  usable in server code.

  **`zod` is no longer imported by the published types.** `ValidateConfig`'s `{ schema }` shorthand
  was typed with `import type { ZodType } from 'zod'`, which the declaration emitter wrote into
  `dist/index.d.ts` unconditionally — so a consumer who had not installed the _optional_ peer could
  not resolve the package's types at all. The shorthand is now typed by the two members the resolver
  actually reads, exported as `ValidationSchema` and `ValidationIssue`. Every zod schema satisfies it
  structurally, so `validate: { schema: mySchema }` and `zodResolver(mySchema)` keep type-checking
  unchanged — and any validator with the same `safeParse` shape now works too.

  **Docs:** the install pages asked for three packages. The kit is the only one to install — it
  depends on the other two and re-exports their whole surface.

- fe267fa: `useDataGrid` returns the table itself. The `DataGridInstance` wrapper is gone.

  It used to return `{ table, store, subscribe, getSnapshot }`, and three of those four were the same functions already on the table:

  ```ts
  createTableStore(table) // → { subscribe: table.subscribe, getSnapshot: table.getSnapshot, … }
  createDataGridInstance(table) // → { table, store, subscribe: store.subscribe, getSnapshot: store.getSnapshot }
  // instance.subscribe === instance.store.subscribe === instance.table.subscribe
  ```

  One function under three names, twice over. The one thing the wrapper genuinely added was a frozen server snapshot for `useSyncExternalStore`, read by exactly one caller — and "the state this table started with" is a fact about the table, so it now lives there as `getInitialSnapshot()`. What was left was a wrapper whose only effect was to put every imperative call one hop further away, and to make the docs name a variable `table` that was not the table.

  ```ts
  // before
  const grid = useDataGrid({ data, columns })
  grid.table.setColumnVisibility({ email: false })

  // after
  const table = useDataGrid({ data, columns })
  table.setColumnVisibility({ email: false })
  ```

  **Breaking changes**
  - `useDataGrid` returns `DataTable<TRow>`; `<DataGrid table={…}>` takes one.
  - `DataGridInstance` and `TableStore` are removed, along with `instance.store`.
  - `createDataGridInstance` → `prepareDataGridTable(table)`, which seeds `table.grid` and returns the same table. Only needed when driving the compound components from a raw `createTable(...)`.
  - `useDataGridSelector(instance, sel)` → `useDataGridSelector(table, sel)`; `useExtractedState(instance, …)` → `useExtractedState(table, …)`.
  - `useDataGridInstance()` is removed — with the wrapper gone it was `useDataGridTable()` under another name.

  **What this costs.** `DataGridInstance` was a type only `useDataGrid` could produce, so passing an unprepared table to `<DataGrid>` used to be a compile error. It now typechecks, and `<DataGrid>` checks for it in development instead, naming the fix rather than crashing on a missing property.

  **New in core** — `DataTable.getInitialSnapshot()`, the frozen construction-time snapshot beside the existing `subscribe` / `getSnapshot`.

- 86e6363: Add `deferredApply`: sorting, column filters and global search accumulate as a draft and reach the
  consumer as a **single** state change when the user applies them, instead of one request per
  keystroke. Requires `manual: true` on `sorting` or `filtering` — the grid throws at construction
  otherwise, because deferring a query the browser answers locally would only add a click.
  - `table.draft` — `get()`, `set()`, `isDirty()`, `getPendingCount()`, `apply()`, `reset()`,
    `resetAxis(axis)`. The draft is grid-owned: seed it with `initialState.draft`, read it through the
    API, and keep the three deferred axes out of the controlled `state` prop.
  - `apply()` emits once, resets `pageIndex` to `0` and clears the row selection in that same state
    change; applying a clean draft is a no-op.
  - Pagination is **not** deferred — a page change stays immediate and carries the applied query.
  - All three UI kits (`shadcn`, `heroui`, `native`) render a `DraftBar` in the action bar they already
    share with selection. While a draft is pending it owns the bar and the selection section collapses
    to a non-interactive count chip. <kbd>Enter</kbd> in a column filter or the search box applies the
    whole draft.

  **Breaking:** `onStateChange` now receives the **resolved** `TableState` instead of an
  `Updater<TableState>` — see the accompanying changeset for the migration.

  **Breaking:** `DraftBarProps` gained a required `variant` prop (`'floating' | 'inline'`), so the
  draft section always renders in the same mode as the selection section of the shared bar. It ships
  for the first time in this release, so no published consumer is affected; only a UI kit built
  against a pre-release copy of the contract needs the new prop.

- ed0250e: **Breaking:** the `link` cell type takes a config, and no longer forces a new tab.

  It was the one cell type of nine with no config: the anchor's text was always the raw URL and the
  target was always `_blank`. "Customer name, linking to `/customers/:id`, in this tab" — the
  ordinary case — had to abandon the cell type and write a `cell.component`.

  ```ts
  { accessorKey: 'customerId', cell: { type: 'link', config: { href: '/customers/{value}', label: 'Open' } } }
  ```

  `LinkCellConfig` carries `label` (fixed anchor text), `href` (a URL template whose `{value}` token
  is replaced by the URL-encoded cell value — the token is required by the type, so a template that
  would point every row at the same page does not compile) and `target`. All plain values, no
  callbacks: a cell type's config lives in the kit's row-agnostic registry, so a callback declared
  there would arrive with `row: unknown` and every call site would open with a cast. Anchor text or a
  URL built from **another field** belongs in `cell.component`, which sees the row's real type.

  **The default target is now `'_self'`** — a grid links inside its own app far more often than out
  of it. Pass `target: '_blank'` to restore the old behaviour; `rel="noreferrer"` is still applied
  whenever the target is `_blank`.

- ed0250e: Add custom per-row actions: `rowActions.actions`

  Bulk actions were already extensible through `selection.panel.actions`, but the per-row actions
  column was closed — a "Duplicate" or "Send invoice" could only be added by replacing `ActionsCell`
  grid-wide (reimplementing edit / delete / pin from scratch) or by adding a second column of buttons,
  leaving the row with two action groups. `rowActions.actions` closes that asymmetry:

  ```tsx
  rowActions={{
  	actions: ({ row }) => [
  		{ id: 'duplicate', label: 'Duplicate', onSelect: () => duplicate(row.original) },
  	],
  }}
  ```

  The callback runs per row, so a row's entries can depend on the row. Custom entries live in the
  overflow menu under both variants — with `variant: 'menu'` there is only the one menu, and with
  `variant: 'inline'` they join the menu that already carries the pin actions, so the column grows by
  one trigger rather than one button per action. The actions column is now injected for a grid whose
  only per-row action is a custom one.

  **Breaking for UI kit authors:** `GridMenuItem.icon` changed from `GridMenuIcon` to
  `GridMenuIcon | undefined`. The built-in glyph names describe grid affordances (edit / delete /
  pin / sort / hide) and an application action such as "Duplicate" has no honest member of that set,
  so an entry may now carry none and render label-only. `GridMenuIcon` itself is unchanged — the
  closed set stays closed.

  Any kit that indexes its icon map with `item.icon` stops compiling and needs a guard:

  ```diff
  -{GRID_MENU_ICONS[item.icon]}
  +{item.icon && GRID_MENU_ICONS[item.icon]}
  ```

  Both first-party kits are already updated. Every entry the grid itself builds still sets `icon`
  unconditionally, so only consumer-supplied row actions ever omit it — render an icon-less entry
  with the glyph's space reserved so its label stays aligned with its siblings.

- 1f068e5: Merge row pinning into the row actions column and add `rowActions.variant`

  **Breaking:** the `__row_pin__` system column is gone. Its menu now lives in the
  `__actions__` column beside edit and delete, so enabling `pinning.row` alone is
  enough to get that column. `ROW_PIN_COLUMN_ID` and `ROW_PINNING_KEY` are no longer
  exported.

  The actions column also carries an explicit width derived from the number of actions
  it renders. It previously had none and fell back to TanStack's 150px default — wide
  enough to leave a visibly empty column next to one icon button.

  **New:** `rowActions: { variant: 'inline' | 'menu' }`. `inline` (default) renders one
  icon button per action side by side; `menu` collapses them into a single overflow
  menu. Save / cancel stay inline while a row is in inline edit mode either way.

  **Kit contract:** the `pinning` component group is replaced by `row-actions`, which
  owns `ActionsCell` (moved out of `editing`) and the new item-driven `RowActionsMenu`
  (replacing `RowPinMenu`). Kits register `'row-actions': { ActionsCell, RowActionsMenu }`.

- 9707040: Collapse the duplicated menu and row-action components into one of each. **Breaking** for
  anyone shipping a custom UI kit.

  **Three slots removed, one added.** `ColumnMenu`, `RowActionsMenu` and `CreatingActionsCell`
  are gone; `core.Menu` replaces the first two. The contract is now 38 injectable components
  instead of 40.
  - `core.Menu` (`GridMenuProps`) renders both the column header menu and the row actions menu.
    It takes `variant` (`GridMenuVariant.Column | .Row` — the only thing that differed), plus
    `sections: GridMenuSection[]` of `GridMenuItem`s. Each item names its glyph semantically via
    `GridMenuIcon`, so a kit keeps one icon map for every menu instead of one per menu.
  - `row-actions.ActionsCell` now covers the creating row too. `ActionsCellProps` became a
    discriminated union on `RowActionsMode` (`Idle` / `Editing` / `Creating`), so each state
    carries exactly the callbacks it can use. `Creating` takes `canCancel` where the old
    `CreatingActionsCell` took `isPinRow`.
  - The wording and grouping of the column menu ("Asc", "Pin Left", the "Sorting" / "Pin"
    headings) moved into `buildColumnMenuSections`, exported alongside `ColumnActionId` — it is
    content, identical across kits, and it previously lived in each kit separately.

  The heroui kit now renders the sections as real `Dropdown.Section`s with a `Header`, so its
  column menu carries the same "Sorting" / "Pin" headings shadcn always had — previously it
  flattened everything into one list. Each section also gets a `group` role named by its heading.

  Removed types: `ColumnMenuProps`, `ColumnMenuSections`, `ColPinSection`, `ColSortSection`,
  `ColVisibilitySection`, `RowActionsMenuProps`, `RowActionItem`, `CreatingActionsCellProps`.

- ed0250e: **Breaking:** the visibility and fallback features are spelled one way, not two.

  The config option was renamed `columnVisibility → visibility` in the previous release, but the
  UI-kit contract kept the old vocabulary: a kit author wrote `visibility: true` and then looked for
  `visibility` in `FullGridComponents`, where the tier was `'column-visibility'`. Same for
  `fallbacks`, whose tier was `'fallback-states'`.

  | before                             | after                        |
  | ---------------------------------- | ---------------------------- |
  | `GridFeature.ColumnVisibility`     | `GridFeature.Visibility`     |
  | tier key `'column-visibility'`     | `'visibility'`               |
  | `GridColumnVisibilityComponents`   | `GridVisibilityComponents`   |
  | `ColumnVisibilityMenu` slot        | `VisibilityMenu`             |
  | `ColumnVisibilityMenuProps`        | `VisibilityMenuProps`        |
  | `DataGrid.ColumnVisibilityTrigger` | `DataGrid.VisibilityTrigger` |
  | `GridFeature.FallbackStates`       | `GridFeature.Fallbacks`      |
  | tier key `'fallback-states'`       | `'fallbacks'`                |
  | `GridFallbackStateComponents`      | `GridFallbackComponents`     |

- ed0250e: **Breaking:** one word per concept across the option surface.

  **"Supply your own renderer" is `component`.** Five column slots already said `component`;
  `expanding.renderExpanded` and `fallbacks.{loading,empty,noResults}.content` said two other
  things. They are now `expanding.component` and `fallbacks.*.component`.

  **"The values this column can take" is `items`.** `cell.config.items` (select, badge) and
  `filtering.options` were the same list under two names on the same column — and `options` is the
  word this config already spends on everything you configure. `column.filtering.options` is now
  `column.filtering.items`, the kit prop `MultiSelectFilterProps.options` is `items`, and
  `MultiSelectOption` is `FilterItem` (`SelectItem` plus the faceted `count`).

  **Bounds are `min` / `max`.** `DateCellConfig.minValue` / `maxValue` — React-Aria's vocabulary,
  sitting next to `ProgressCellConfig.max` and `ColumnWidthDef.min` / `max` — are now `min` / `max`.

  **`aria-label` is `aria-label`.** `ClearFiltersButtonComponentProps` and the
  `<DataGrid.ClearFiltersButton>` prop spelled it `ariaLabel` while `GridMenuProps` and `ButtonProps`
  used the React spelling. Now all of them use `'aria-label'`.

  **`ActionsCellProps` carries a `state`, not a `mode`.** `RowActionsMode` named a row's current
  state, not what the feature does, and collided in autocomplete with `RowActionsVariant` two lines
  away. It is `ActionsCellState`, and the prop is `state`.

  **`selection.bar.onClear` is `selection.bar.clear`.** Every other `on*` in this API notifies; this
  one _replaces_ the bar's clear behaviour. The name now says so.

  **Type-name suffixes.** `ConfirmationOptions` → `ConfirmationConfig`, `BulkConfirmationOptions` →
  `BulkConfirmationConfig`, `RowVirtualOptions` → `RowVirtualizationConfig`,
  `ColumnPinningFeatureConfig` → `ColumnPinningConfig`, `VisibilityUIConfig` →
  `ReactVisibilityConfig` (matching `ReactSortingConfig` and the rest).

- 79a6f4c: **Breaking:** `defineColumns` is renamed to `createColumns`. The signature and behaviour are unchanged — only the name differs, and there is no compatibility re-export.

  ```diff
  -import { defineColumns } from '@ez-kit/data-grid-react'
  +import { createColumns } from '@ez-kit/data-grid-react'

  -const columns = defineColumns<User>([{ accessorKey: 'name', header: 'Name' }])
  +const columns = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])
  ```

  `define*` is a Vue/Vite idiom (`defineConfig`, `defineComponent`); the React ecosystem — and the rest of this package's own surface (`createTable`, `createColumnHelper`) — uses `create*`. The helper now matches its neighbours.

- a166bc0: Public API audit: fix two runtime breaks, make the compound components actually composable, and
  settle the naming conventions before 1.0. Contains breaking changes.

  **Fixed**
  - `createDataGrid` no longer drops compound members. The factory copied them by hand and had
    fallen five behind, while `as typeof DataGrid` typed them as present — so `<DataGrid.SelectionBar />`,
    `.DraftBar`, `.SortTrigger`, `.GlobalFilterInput` and `.ColumnVisibilityTrigger` from a kit were
    `undefined` at runtime with no compile error.
  - `rowActions.variant` is usable. It was a TS `enum`, so the documented `variant: 'menu'` did not
    compile, and the enum was not exported from the adapter or the kits — leaving no way to write
    the value at all.
  - `column.filtering: false` now sets `enableColumnFilter: false`, so `column.getCanFilter()` agrees
    with the config. It previously reached only `meta`, and any consumer-built control reading the
    TanStack API saw the wrong answer.

  **Breaking**
  - Closed sets are `const` objects plus same-named string unions instead of `enum`s
    (`RowActionsVariant`, `RowActionsMode`, `RowActionId`, `GridFeature`, `GridMenuIcon`,
    `GridMenuVariant`, `ColumnActionId`, `BetweenBranch`). `X.Member` still works as a value and `X`
    still works as a type; a bare string is now assignable too. `PaginationVariants` is renamed to
    `PaginationVariant` for the same shape.
  - `variant` now always means presentation and `mode` always means behaviour:
    `creating.mode` → `creating.variant`, `editing.mode` → `editing.variant`,
    `expanding.variant` → `expanding.mode` (`ExpandingVariant` → `ExpandingMode`).
  - Raw TanStack pass-throughs are gone from `ColumnDef` — each duplicated an ez-kit alias:
    `enableColumnFilter` → `filtering: false`, `enableGlobalFilter` → `globalFilter: false`,
    `enableHiding` → `visibility: true`, `enableResizing` → the new `resizing: false`.
  - `sorting.toolbar` moved from the headless `SortingConfig` to `ReactSortingConfig`, joining
    `globalFiltering.toolbar` and `columnVisibility.toolbar` in the layer that reads it.
  - `TableConfig.columnVisibility` is `boolean` rather than `boolean | object`, which had let any
    misspelled key through unchecked.
  - The internal `Symbol()` keys (`SORTING_KEY`, `VIRTUALIZED_KEY`, `FALLBACKS_KEY`, …) are no longer
    exported. They carry normalized config on the table instance and were never usable API.
  - Under an options provider, `feature: true` at a call site no longer wipes a defaulted config
    object. Both spellings mean "enabled", so the config survives; `false` still turns it off.

  **Added**
  - `<DataGrid.Table>` and `<DataGrid.Body>` accept `children`, as nodes or a render function over
    the live table. The compound members were exported but not composable — `Table` rendered its own
    header and body, `Body` its own rows, and neither took props.
  - `<DataGrid.Toolbar>` accepts `left` / `right`, which append to the auto-mounted controls instead
    of replacing them. Previously `children` was the only hatch and it replaced the whole bar.
  - `<DataGrid.Header />` resolves `stickyHeader` from the grid option, so it works placed by hand.
  - `column.header` / `column.footer` accept a render function. The renderer path always worked via
    `flexRender`; only the `string` type forbade it.
  - The adapter re-exports the whole of `@ez-kit/data-grid-core`, and the shadcn / heroui kits
    re-export the whole adapter. ~50 core types — `CellType`, `ColumnSortingConfig`, `RowActionsConfig`,
    `LoadingState`, `ACTIONS_COLUMN_ID` and more — were unreachable from a kit, which forced a second
    direct dependency just to name a type.
  - New docs page: **Composition**.

### Patch Changes

- a1bfede: fix(data-grid): floating selection bar no longer affects layout

  The floating selection bar was itself the `sticky` element, which stays in flow. In the
  heroui kit it mounted only once a row was selected, so selecting grew the grid by the bar's
  height and shifted everything below it; in the shadcn kit it was mounted permanently, so it
  reserved that height under every grid even with nothing selected.

  Both kits now render the bar absolutely inside a zero-height sticky anchor
  (`data-slot="action-bar-anchor"` / `data-slot="selection-bar-anchor"`). The bar overlays the
  last rows instead of displacing them, and the grid's height is identical whether or not rows
  are selected. Sticky-to-scrollport behaviour, `align` and `sideOffset` are unchanged.

- ed0250e: Rewrite both kit README quick-starts against the real entry point. They previously imported `createColumns` from `@ez-kit/data-grid-react` — which drops cell-type checking against the kit's own registry — and called `createTable` at module scope, outside React, so the grid never reacted to a changing `data` prop and the whole `useDataGrid` option layer was bypassed. Both now import everything from the kit, call `useDataGrid` inside the component, type the row via `createColumns<User>`, and ask for one package rather than three.
- Updated dependencies [ed0250e]
- Updated dependencies [9707040]
- Updated dependencies [ed0250e]
- Updated dependencies [fe267fa]
- Updated dependencies [fe267fa]
- Updated dependencies [ed0250e]
- Updated dependencies [fe267fa]
- Updated dependencies [fe267fa]
- Updated dependencies [fe267fa]
- Updated dependencies [ed0250e]
- Updated dependencies [f92d88b]
- Updated dependencies [a132c57]
- Updated dependencies [a132c57]
- Updated dependencies [2f7c40d]
- Updated dependencies [d709ff3]
- Updated dependencies [a132c57]
- Updated dependencies [d709ff3]
- Updated dependencies [d709ff3]
- Updated dependencies [fe267fa]
- Updated dependencies [d709ff3]
- Updated dependencies [d709ff3]
- Updated dependencies [fe267fa]
- Updated dependencies [d709ff3]
- Updated dependencies [a132c57]
- Updated dependencies [fe267fa]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [1f19a95]
- Updated dependencies [86e6363]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [af8d6a1]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [1f068e5]
- Updated dependencies [1f068e5]
- Updated dependencies [9707040]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [d825988]
- Updated dependencies [abaa123]
- Updated dependencies [1f068e5]
- Updated dependencies [79a6f4c]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [a166bc0]
- Updated dependencies [1f068e5]
- Updated dependencies [ed0250e]
  - @ez-kit/data-grid-react@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [904d9df]
- Updated dependencies [6cf77ea]
  - @ez-kit/data-grid-react@0.1.1

## 0.1.0

### Minor Changes

- 24bf599: Re-export the full consumer surface from the kit packages, so a kit is self-sufficient and consumers no longer need `@ez-kit/data-grid-react` as a second dependency to reach it.

  Newly available from `@ez-kit/data-grid-shadcn` and `@ez-kit/data-grid-heroui`:
  - values — `defineColumns`, `extractState`, `parseState`, `useExtractedState`, `ValidationError`
  - types — `ColumnDef`, `ColumnFiltersState`, `DataGridProps`, `DateRangePreset`, `SortingState`, `TableState`

  ```ts
  // before — two packages
  import { DataGrid, useDataGrid } from '@ez-kit/data-grid-shadcn'
  import { defineColumns } from '@ez-kit/data-grid-react'

  // after — one
  import { DataGrid, useDataGrid, defineColumns } from '@ez-kit/data-grid-shadcn'
  ```

- 6c179f3: Show filter operators as English text instead of icon symbols. The `symbol` field is removed from `FilterOperatorDef`, and every operator surface — the operator select (shadcn / heroui / native) and the active-filter chips — now renders `label` (`Contains`, `Greater than`, `Between`…) rather than a glyph (`⊇`, `>`, `↔`). This is a breaking change: drop `symbol` from any custom operator definition, and rely on `label` for the user-facing text.
- 146122e: Add `pagination.variant` for the page-based footer: `'numbered'` (the default), `'simple'` (prev/next + an "X–Y of N" range label) and `'compact'` (prev/next + "Page X of Y"). The option takes the `PaginationVariant` string union, so no import is needed; the exported `PaginationVariants` const object (`PaginationVariants.Simple`) is optional sugar for the same values. The variant is presentational only — paging behaviour is identical across variants and the footer position is unchanged. Load-more is not a variant; it remains `pagination: { mode: 'infinite', trigger: 'manual' }`.

  `'numbered'` keeps its existing layout in the shadcn and heroui kits — prev/next, a link per page, and the range label. Its label does change where the old one was wrong: a partial last page read `1–6 of 11` and now reads `1–10 of 11` (see the `pageSize` fix below).

  **In the native kit the `'numbered'` footer changes shape**: it previously rendered `«  ‹  1 / 5  ›  »` and now renders the range label plus a button per page (`«  ‹  1–10 of 50  1 2 3 4 5  ›  »`), matching the other kits and the variant's name. Pass `variant: 'compact'` for a footer close to the old native default.

  Breaking for custom `Pagination` components supplied via `createDataGrid({ components })`:
  - `PaginationProps.variant` (`PaginationVariant`) and `PaginationProps.pageSize` (`number`) are new **required** props.
  - `PaginationProps.pageCount` is now **optional** (`number | undefined`). It is `undefined` when the total is genuinely unknown — a manually paginated grid given neither `rowCount` nor `pageCount`. Previously the core `-1` sentinel leaked through and rendered verbatim (`"Page 1 of -1"`).
  - `PaginationProps.rowCount` is now `undefined` whenever the total is unknown, instead of echoing the loaded page length. It is no longer inferred from `getRowCount()` under `manualPagination`, which produced inverted ranges such as `"21–10 of 10"`.
  - `pageSize` is passed through from the table state rather than derived as `ceil(rowCount / pageCount)`, which was wrong on a partial last page (11 rows at `pageSize: 10` produced `"1–6 of 11"`).

  Core now exports `UNKNOWN_PAGE_COUNT` (the `-1` sentinel it hands to TanStack), and the React package exports `buildPaginationLabel` — the shared footer-label rule every UI kit renders.

### Patch Changes

- Updated dependencies [005a133]
- Updated dependencies [f81d1af]
- Updated dependencies [1edda75]
- Updated dependencies [6c179f3]
- Updated dependencies [803b41b]
- Updated dependencies [146122e]
- Updated dependencies [1edda75]
  - @ez-kit/data-grid-react@0.1.0

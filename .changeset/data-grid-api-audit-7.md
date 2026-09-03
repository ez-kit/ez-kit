---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Close ten defects the seventh API audit turned up.

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

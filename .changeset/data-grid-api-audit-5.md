---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Close the gaps a fifth pass over the public API turned up. Breaking, and pre-1.0, so it ships as
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

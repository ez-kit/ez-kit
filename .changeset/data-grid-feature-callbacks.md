---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

One `onChange` rule for every feature, and a fix for the selection callback that disabled
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

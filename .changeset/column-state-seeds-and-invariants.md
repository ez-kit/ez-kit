---
'@ez-kit/data-grid-core': minor
---

Rework how column-level defaults, `initialState` and controlled `state` interact.

**Breaking — renamed two column options.** `pinning.defaultPin` is now `pinning.initialPin`
and `visibility.defaultHidden` is now `visibility.initialHidden`. They are the only
column-level fields that seed `initialState` once at construction, so they now say so,
matching TanStack's `state` / `initialState` split. The fallbacks that are re-read on every
render (`filtering.defaultOperator`, the cell-type `defaultOperator`, `createDataGrid`'s
`defaultOptions`) keep their `default*` names.

**Breaking — `initialState` no longer accepts transient slices.** It is typed
`InitialTableState`, which omits `editing`, `creating`, `pendingDeleteRowId` and
`pendingBulkDelete` — each feature hard-resets those whenever its form or dialog opens, so a
seeded value was silently discarded. It is a type error now.

**Fixed — `initialState.columnPinning` / `columnVisibility` no longer wipe column defaults.**
Both slices merge instead of replacing: a column the consumer does not mention keeps its
`initialPin` / `initialHidden`, one it does mention is the consumer's. Previously a single
`initialState.columnPinning` dropped every static pin, every seed, and the pins of the
`__selection__` and `__actions__` system columns, which have no other source.

**Fixed — system columns can no longer be hidden or unpinned by state.** System columns and
`visibility: true` locked columns are now enforced on every write path (`initialState`,
controlled `state`, `table.setState`), as are static `pinning: { pin }` columns. The column
menu deliberately offers no way to restore them, so a state that hid or unpinned one was
unrecoverable.

**Added — default values for the create form.** A column may declare
`creating.defaultValue` and the grid `creating.defaultValues`; both take a plain value or a
synchronous function (`{ table, columnId }` / `{ table }`), are resolved on every
`creating.start()`, and the table level wins per key.

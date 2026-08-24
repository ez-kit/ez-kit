---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
'@ez-kit/data-grid-native': minor
---

Add `deferredApply`: sorting, column filters and global search accumulate as a draft and reach the
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

---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

**Breaking:** bulk delete moves from `selection.panel` to `deleting.bulk`.

Deleting the selection is the delete feature operating on more than one row, but its handler and
its prompt lived on the config of the bar that happens to render the button. The two halves never
met: a grid with `deleting: { onDelete, confirmation }` got no bulk affordance at all until it
repeated the handler _and_ the confirmation copy under `selection.panel`, and `ConfirmationOptions`
was therefore configured twice for one concept.

```ts
// before
selection: { panel: { onDelete: ({ selectedRows }) => …, confirmation: true } }

// after — one word when the per-row handler already does the job
deleting: { onDelete, bulk: true }

// after — one call for the whole set
deleting: { onDelete, bulk: { onDelete: ({ rowIds }) => api.removeMany(rowIds), confirmation: true } }
```

- `deleting.bulk` is the usual scalar-or-object: `true` loops `deleting.onDelete` over the
  selection (sequentially, so a store that mutates per call sees each write land), an object adds
  a single-call `onDelete` and its own `confirmation`.
- `BulkConfirmationOptions.description` receives the **selected rows**, not a row — a prompt that
  cannot say "Delete 3 orders?" is not a prompt for deleting three orders.
- The deleted ids leave `state.rowSelection` once the handler resolves, so the bar never counts
  rows that no longer exist. Clearing it by hand from every handler is no longer needed.
- New on the table: `table.deleteRows(rowIds)`. `table.confirmBulkDelete()` now runs the delete
  (and returns a promise) rather than only clearing the staged flag — the handler lives in core
  now, so core runs it.

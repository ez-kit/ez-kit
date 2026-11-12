---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

BREAKING: bulk deletion requires `deleting.bulk.onDelete`. The grid no longer falls back to calling single-row `onDelete` in a sequence. `bulk: true` is no longer accepted by the base-grid type; invalid dynamic configurations report the missing executor. Confirmation and success deselection remain unchanged; rejection preserves selection.

Provide a batch handler, or move an intentional sequential loop into `bulk.onDelete`. Applications own reconciliation of partial successes; the grid does not interpret per-row statuses. Connected `withQuery` grids may still use `bulk: true` when the source supplies `deleteMany`, because the connector installs the executor.

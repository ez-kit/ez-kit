# 0030. Mutation lifetime is independent of modal lifetime; bulk work is explicit

- Status: Accepted
- Recorded: 2026-11-12
- Related: [0028](./0028-query-connector-boundary.md), [0029](./0029-query-grid-state-and-cache.md)

## Decision

Pending form validation/submission disables Save and Cancel; permitted modal
dismissal abandons the form session without aborting an already-dispatched
connector mutation. Late results cannot update another session. Native lifecycle
callbacks see original errors, while transformError maps only the grid-facing
error. Bulk deletion requires one explicit executor, with no single-delete
fallback or inferred partial-success protocol.

## Context, rationale and rejected alternatives

This records D7–D8 of `qc-react-data-grid`. Closing a modal is a UI action and cannot
promise server rollback. Connected mutations therefore receive no form dismissal
signal; read queries still forward Query's signal. Explicit application handlers
retain the existing signal contract and decide their own transport behavior.

Save and Cancel disable during pending work to prevent duplicate submissions and
ambiguous cancellation. The close control and configured Escape/backdrop remain
available. Mutation callbacks live at hook scope and survive observer unmount;
per-call callbacks could disappear and skip success invalidation or error reporting.
After persistence and awaited native lifecycle complete, the form closes without
waiting for automatic background refresh. Unknown errors are preserved by default;
factory/source/operation transformError can map server field errors to ValidationError
only at the grid boundary. New or closed sessions must not receive late validation.

Core previously looped over single-delete callbacks when no bulk callback existed.
That silently chose request sequencing and partial-failure behavior for applications.
Now enabled bulk requires `deleting.bulk.onDelete`; the connector supplies it from
`deleteMany`. Confirmation and deselection on success remain. A rejected operation
does not claim all rows succeeded. Applications that want a loop must write it and
own partial failures and refresh policy. There is no automatic updateMany UI or
optimistic mutation protocol in this scope.

Guards: `packages/qc/react/src/data-grid/modal-session.test.tsx`,
`modal-kits.test.tsx`, `mutation-source.test.tsx`,
`packages/data-grid/core/src/features/deleting/deleting.test.ts`, and
`apps/docs/e2e/packages/data-grid/editing/query-modal.spec.ts` in both kits.

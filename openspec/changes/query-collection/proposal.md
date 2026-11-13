# Proposal

## Why

The current qc-react connector combines reusable collection reads and CRUD execution with DataGrid state and event handling. Applications cannot reuse that behavior for ordinary lists without depending on grid-specific parameters and action contexts.

## What Changes

- Add `@ez-kit/query-react/collection` with `createCollectionSource`, a reusable API-convention factory, and `useCollectionQuery`.
- Infer arbitrary external parameters, item projections and independently typed mutation inputs, fetcher arguments, results, errors and optimistic contexts.
- Support paged-only, infinite-only and dual-mode sources; preserve native cache responses and query/mutation results.
- Execute mutation `prepareArgs` inside `mutationFn`; expose native `mutate` and `mutateAsync`, not a new `execute` method. Factory lifecycle callbacks receive the original input.
- Reuse collection execution in `qc-react/data-grid`; retain table-owned state, explicit action enablement, overrides, page correction and form error adaptation there.
- Preserve existing grid/native mutation callback contracts through explicit compatibility adapters rather than silently changing callback variables.
- Document a complete ordinary CRUD list, shared API conventions, arbitrary parameters, infinite reads, Orval fetchers and adaptation to DataGrid.

## Capabilities

### New Capabilities

- `query-collection`: UI-independent typed collection sources, Query execution and mutation lifecycle, including their integration boundary with the existing grid connector.

### Modified Capabilities

None in the current main spec inventory. `query-gate` behavior is unchanged. The completed but unarchived `qc-react-data-grid` change owns `query-grid-connector`; this change builds on its implementation and preserves its published behavior rather than duplicating that capability. Archive reconciliation must retain both contracts.

## Impact

- `packages/query/react`: new subpath, source/factory types, hooks, runtime/type tests, package metadata, independent bundle budget and documentation.
- `packages/qc/react`: dependency on query-react, collection adapters and refactored execution; existing component/hook entry points and kit typing remain.
- `apps/docs`: ordinary list examples and connector recipes, API coverage, browser checks and navigation.
- Workspace release metadata, React 18 checks and ADRs 0028/0029 need updates reflecting the new ownership boundary; ADR 0030 modal and bulk guarantees remain.
- No new package, state-management hook, alternative query engine, form connector, automatic optimistic protocol, bulk partial-success protocol or code generator. At least one read operation is required; mutation-only sources are outside this scope.

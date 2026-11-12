# 0029. Tables own query parameters; Query owns cached responses

- Status: Accepted
- Recorded: 2026-11-12
- Related: [0028](./0028-query-connector-boundary.md), [0026](./0026-filter-input-commit-policy.md)

## Decision

Connected grids read applied pagination/filter/sort state from table selectors and
use manual server processing. Factory keys are base/list/prepared-args or
base/infinite/collection-args; infinite cursors and transport signals do not enter
collection identity. Native sources preserve their keys and require explicit
invalidation scope. Successful automatic mutations invalidate both list families
without awaiting refetch, preserving native lifecycle semantics.

## Context, rationale and rejected alternatives

This records D5–D6 of `qc-react-data-grid`. A second component parameter state would
diverge from draft Apply, existing debounce, table controls and persistence.
Applied criteria reset the page atomically, avoiding a new-filter/old-page request.
Only fresh successful authoritative totals can correct an out-of-range page;
placeholder or stale cached totals cannot. Unknown totals do not imply a last page.

Keys describe interchangeable data, not grid instances or function references.
Every request-affecting business input (including tenant) must appear in key
arguments. A cursor selects one page inside an infinite collection. The connector
projects accumulated cached pages without calling appendData, and mode switching
keeps one table and stable hook paths with inactive queries disabled. Initial,
background and next-page status remain distinct; failed refreshes keep existing rows.

Factory sources own their list/infinite prefixes; arbitrary native options do not.
Guessing a prefix could invalidate unrelated data. `source.queries.list(params)`
and `source.queries.infinite(params)` expose the same options for prefetch and
other native consumers. Detail queries are not in the default list policy.

An omitted invalidation policy inherits defaults; false disables; additional adds
independent native query filters; replace supplies the whole policy. An operation's
additional extends resolved source rules, while replace/false overrides them.
Additional and replace are mutually exclusive. One queryKey array is a composite
key; several filter objects select several families.

User lifecycle callbacks keep their arguments, awaited promises and optimistic
context. Automatic invalidation runs in a protected success-finally path, even if
a user success callback throws. Each filter launch isolates synchronous predicate
errors and asynchronous refetch rejection. Refresh errors are query errors and
must not turn completed persistence into failure or keep a form pending.

Guards: `packages/qc/react/src/data-grid/pagination.test.tsx`,
`cache-scope.test.ts`, `infinite-source.test.ts`, `invalidation.test.ts`,
`mutation-source.test.tsx` and `with-query.test.tsx`.

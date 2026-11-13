# 0031. Query collections execute server work; connectors adapt UI state

- Status: Accepted
- Recorded: 2026-11-13
- Related: [0022](./0022-query-gate-native-tanstack.md), [0027](./0027-infinite-query-native-gate.md), [0028](./0028-query-connector-boundary.md), [0029](./0029-query-grid-state-and-cache.md), [0030](./0030-grid-mutation-sessions-and-bulk.md)

## Decision

UI-independent collection sources, API-convention factories and `useCollectionQuery` live in
`@ez-kit/query-react/collection`. Parameters are arbitrary and externally owned; the hook returns
projected items and native read/mutation results without a second cache, state store or execute
method. New fetcher mutation preparation runs inside mutationFn, so callbacks receive original
input and retry repeats preparation. Factory mutation keys default to the base key plus operation;
explicit and native keys retain native behavior. `qc-react/data-grid` adapts applied table state and
action contexts, owns page resets/correction and form error conversion, and preserves existing
source callbacks through compatibility adapters. Query-react never imports a grid or visual kit.

## Context, rationale and rejected alternatives

This implements the durable choices in query-collection D1–D4 and D6–D7. Previously, withQuery owned
query observers and generic invalidation alongside table publication. Ordinary lists needed the
same behavior but should not inherit column filters, row IDs or Partial<Row> mutation inputs.
The collection entry provides that execution boundary without growing the query gate entry.

This supersedes the generic execution ownership in ADRs 0028/0029. Their grid integration remains
in qc-react: withQuery preserves bundle typing and compound members, accepts dataSource at use,
keeps table identity, and does not connect supplied tables twice. The base grid remains independent
of Query. Applied parameters remain table-owned; Query remains the only server cache. Generated
list/infinite keys and non-blocking successful mutation invalidation retain their prior semantics.
Fresh successful totals alone correct out-of-range pages; unknown/placeholder totals cannot.

New collection factories expose native mutate/mutateAsync and independently infer operation input,
transport arguments, result, error and optimistic context. onMutate runs before prepareArgs. A
preparation failure is a mutation error and can be retried; preparation must therefore be pure.
Ready-made native options retain their variables, keys and callbacks. Existing grid sources keep
preparation before dispatch, preserving prepared-variable callbacks; compatibility lives in qc-react
rather than duplicating Query execution. Form error adaptation does not alter native errors.

A pending TanStack mutation can receive updated observer options when the key stays unchanged.
Generated mutation keys separate different base-key ownership scopes such as tenants. Explicit
keys remain application-owned; we do not promise frozen callbacks for arbitrary same-key edits.
Applications must put changing ownership scope in the base key or their explicit mutation key.

Rejected: fixing all parameters to TanStack Table state; adding grid contexts to business mutations;
a second collection store; a public execute wrapper; custom lifecycle freezing; a new package;
automatic deleteMany loops. Ordinary lists own their state and page policies. The connector preserves
explicit editing/creating/deleting enablement, handler precedence, modal session isolation and bulk
executor requirements from ADR 0030. Query gate contracts in ADRs 0022/0027 remain unchanged.

Guards: query-react collection runtime/type tests and registered-error project; qc-react adapter,
source, pagination, mutation and modal suites; docs query-collection browser scenario and both kit
query-source/query-modal browser suites. The Orval collection recipe checks shared request identity.

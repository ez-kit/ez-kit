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

A base key is required for every generated fetcher operation, including writes alongside native
reads. Native read invalidation remains explicit. When an optional operation disappears, retain
its last committed descriptor and invalidation scope for already dispatched work; substituting a
placeholder would rewrite pending callbacks and retries, including for keyless native mutations.

Automatic grid actions check their captured effective mutation key again before preparation and
dispatch, so asynchronous validation cannot route an old action through a new owner. A mismatch
rejects the stale action as a final guard. On an ownership change the connector first cancels
pending validation through the neutral form API, preserving values and the open session. Late
validation results are ignored and cancelled commits settle quietly; dispatched saves are unaffected.
Applications may explicitly cancel forms when switching scope. The grid's
next-page deduplication is scoped to effective query identity, including client hash functions.

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

Connected grids expose the collection's restricted observer-policy overrides as `queryOptions`.
Source identity, projection and infinite cursor contracts cannot be overridden by a consumer.
External parameter/page-reset state stays application-owned.

Infinite loader state also follows collection ownership. The neutral React grid accepts a
loadMoreKey; its normalized per-scope token coordinates all loader instances and ignores stale
promise settlements. The Query connector supplies its effective query hash. This token owns
transient loader UI only, not pagination parameters or cached responses.

A stale initial cache total cannot trigger either connector correction or the base grid's shrink
clamp. Fresh enabled cache data and successful current-observer responses are authoritative;
staleTime zero does not disqualify a just-completed response. Automatic mutation callbacks invoked
before passive publication wait for the committed observers, then recheck owner and pre-dispatch
form cancellation. Native options remain the execution authority.

Read projection invariants apply equally to collection and direct grid helpers. A shared consumer
conformance fixture covers both public entries. Structural collection observer overrides derive
from full native option types, not only the fields present in a literal descriptor.

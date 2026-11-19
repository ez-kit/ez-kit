# 0032. Router state and independent navigation identity

- Status: Accepted
- Recorded: 2026-11-19
- Related: [0028](./0028-scoped-state-persistence.md)

## Decision

React Router query persistence preserves arbitrary application location.state and tracks own writes
through generated location keys observed read-only. Basic routers require an observable navigator
location; data-router dispatch, including blocker continuation, must synchronously publish its key.
Unsupported identity observation fails explicitly; uncertain delayed publication is not classified
as proven cancellation. No router or global history methods are patched.

## Context, rationale and rejected alternatives

An ownership token spread into location.state retained ordinary object fields but destroyed primitive
values and array shape. The state value belongs to the application and is not a metadata channel.
Query equality alone also cannot distinguish an external navigation with the same target from a
persistence acknowledgement.

Basic routers expose generated location keys through their history navigator. Data routers publish
navigation, location and blocker keys through observable state; dispatch observation and the retained
options getter cover normal dispatch and blocker continuation while preserving the exact state value.
The implementation reads feature-detected exported UNSAFE integration contexts. Those integration
points are upstream-sensitive, so capability checks and regressions bound support explicitly.

React Router's public navigate does not return a per-command identity and discards a caller-supplied
location key. A router that delays key publication before navigation state is visible cannot always
prove dispatch origin without an application-state token or patched methods. Synchronous publication
is a precondition, not a promise to infer the origin of every violating custom router. A diagnostic
for uncertain publication retains recovery intent because the command might still commit.

Rejected: changing primitive state into an object wrapper, injecting a reserved application-state key,
silently matching commands by query alone and patching navigate/history. Next retains its separately
documented public-hook identity limitation.

Guards: store-persist/src/url/react-router-state.test.tsx, react-router-data.test.tsx,
render-ownership.test.tsx and history-cancellation.test.tsx cover application state, independent own
keys, blockers, delayed publication, committed renders and Back/Forward.

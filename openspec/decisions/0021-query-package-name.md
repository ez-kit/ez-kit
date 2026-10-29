# 0021. The TanStack Query adapter is `@ez-kit/query-react` in `packages/query/react`

- Status: Accepted
- Recorded: 2026-10-29

## Decision

**The React adapter over TanStack Query is `@ez-kit/query-react`, in `packages/query/react`, named
`<feature>-<framework>` like `data-grid-react` and `form-react`.** Another framework's adapter is
`query-vue` (and so on) in the same `packages/query/` group. A `query-core` package is created only
when two adapters actually share code; until then the framework-independent logic
(`resolveGateState`) is a module inside `query-react`. The directory, the npm name and the docs
route (`/docs/query-react`) match.

## Context, rationale and rejected alternatives

The repo already has two naming schemes. Store packages are named after the backing library
(`zu-store`, `va-store`) because several libraries implement the same idea and the name has to say
which one. Everything else is named after the feature and the framework it binds to.

**`ta-query` — rejected.** The library prefix exists to tell sibling bindings apart. No second
query library is planned, and the data grid, which is built on TanStack Table, carries no prefix
either. Adopting it here would make TanStack the exception that looks like the rule.

**`@ez-kit/react-query` — rejected.** It repeats `@tanstack/react-query` and the legacy
`react-query` package (v3). In auto-import lists and in conversation "react-query" becomes
ambiguous, and the name breaks the `<feature>-react` order the other adapters use.

**A `query-core` package up front — rejected.** It would hold one pure function and add a package,
a budget and a release line with no second consumer. `resolveGateState` is already isolated and
tested on its own (`packages/query/react/src/resolve-gate-state.test.ts`), so extracting it later
is a move, not a rewrite.

The decision was made in the `query-react` OpenSpec change (design D1).

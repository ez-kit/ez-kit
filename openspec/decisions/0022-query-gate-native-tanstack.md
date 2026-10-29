# 0022. The query gate keeps TanStack's names and has no data channel of its own

- Status: Accepted
- Recorded: 2026-10-29
- Related: [0021-query-package-name](./0021-query-package-name.md)

## Decision

**`<Query>` passes TanStack's own `useQuery` result through unchanged, and descendants read the
gate's data with TanStack's `useSuspenseQuery` and the same `queryOptions` — the package has no
`useData()`, no scope and no context carrying data.** The render functions are symmetric,
`children(data, q)` and `error(error, q)`, where `q` is the `useQuery` result: no field is renamed
(`refetch` does not become `retry`) and none is filtered out. The descendant recipe is
documentation (`apps/docs/content/docs/query-react/data-under-gate.mdx`), not API. Re-proposing a
data channel needs a concrete case the recipe cannot cover.

## Context, rationale and rejected alternatives

Below a gate the data is already in TanStack's cache under the query's key, and `queryOptions` is
already a typed handle on that entry. For a descendant that mounts together with the gate's
`children`, `useSuspenseQuery`:

- does not suspend, since the data is in the cache;
- types `data` as `TData` without `undefined`, inferred from `queryOptions`;
- does not throw when a background refetch fails — by default it throws only when there is no
  data;
- does not fire a second request, because Suspense mode raises `staleTime` to a one-second floor.

Each descendant subscribes on its own, so it re-renders on its query and not on its parent, and may
pass its own `select` without changing anyone else's data.

**`Query.useData<T>()`, the nearest gate's data through context — rejected.** The type rests on an
explicit generic the compiler never checks; TypeScript has no partial type-argument inference, so
`useData<Device>((d) => d.name)` leaves the result `any` silently. A nested gate shadows the outer
one without a word. A `select` on the gate changes the data's shape for every descendant, and their
annotations become wrong with no compile error.

**`createQueryScope(factory)`, a typed scoped context — rejected.** It fixes the typing, but it
duplicates what `QueryCache` already is: a store keyed by query key with types inferred from
`queryOptions`.

**Renaming or curating `q` — rejected.** Every name in `q` is the one TanStack's documentation
uses, so a reader can look it up there; a curated subset would need its own docs and would lag
TanStack's minor releases.

Known limits, documented on the page above: the recipe is safe only below a gate for the same query
or below a `<Suspense>` boundary. Under a gate it still suspends while the gate shows
`placeholderData` (including `keepPreviousData`), since a placeholder is not in the cache under the
current key, and a descendant that mounts later — a tab, a dialog — finds the data stale under the
default `staleTime: 0` and refetches in the background, without suspending or throwing.

Guards: `packages/query/react/src/data-under-gate.test.tsx` (no suspend, one request, data kept on
a failed refetch) and `packages/query/react/src/query.types.test.tsx` (`q` and `error` typed from
the query). The decision was made in the `query-react` OpenSpec change (design D4).

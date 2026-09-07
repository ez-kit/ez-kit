---
'@ez-kit/va-store': minor
---

Add `useTimeline(store)` — the assembled timeline of a `withHistory` store.

`goto(index)` addresses `[...pasts, current, ...futures]`, but `current` was the one part of that a
caller had to rebuild by hand, field by field, from a snapshot. `useTimeline` returns it assembled:
`steps` (the full timeline), `index` (`pasts.length`, so `steps[index] === current`), `current` (the
live state shaped like a step — the store's fields, without `history`), and `goto`.

It is a separate hook rather than more fields on `useHistory` because assembling `current` means
`useSnapshot(store)`, and valtio re-renders a component on any store write once it snapshots the
store — even one that reads nothing off the snapshot. On `useHistory` that cost would land on every
caller, including a toolbar that only wanted `undo` / `redo`; on `useTimeline` it lands only where
the state is rendered anyway.

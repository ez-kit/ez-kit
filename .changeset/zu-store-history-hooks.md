---
'@ez-kit/zu-store': minor
---

Add `useHistory(store)` and `useTimeline(store)` — the two history hooks `@ez-kit/va-store` already
ships, in Zustand's shape.

`useHistory` takes one subscription to the `history` sub-store and returns the stacks, the controls
and derived `canUndo` / `canRedo` as a single object, so a toolbar stops hand-selecting four fields
off `store.history`:

```diff
- const canUndo = useStore(store.history, (h) => h.pasts.length > 0)
- const undo = useStore(store.history, (h) => h.undo)
+ const { undo, canUndo } = useHistory(store)
```

`useTimeline` assembles `[...pasts, current, ...futures]` with the index the store sits on, for the
UIs that render the timeline itself — a step strip, a "3 of 7" read-out, anything driving `goto()`.
It stays a separate hook because reading `current` means subscribing to the store's whole state; on
`useHistory` that cost would land on every caller, including a toolbar that only wanted `undo`.

Also declares the optional peers the persist subpaths need (`next`, `react-router`, `zod`), which
were reachable only transitively through `@ez-kit/store-persist`, and puts the
`persist/url/react-router` bundle under a size-limit budget.

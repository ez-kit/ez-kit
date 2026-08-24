---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

Gate what leaves the grid while a query draft is pending (`deferredApply`).

With `deferredApply: true` the live `sorting` / `columnFilters` / `globalFilter` slices hold the
draft the user is composing, while `state.applied` holds the query the consumer last saw. The
`onStateChange` funnel now substitutes the applied snapshot over those three axes before emitting
and stays silent entirely when the substituted snapshot is unchanged — so draft edits emit nothing
(neither `onStateChange` nor the per-feature `sorting.onChange` / `filtering.onChange` /
`globalFiltering.onChange`), `draft.apply()` emits exactly once, and a page change while dirty
carries the applied query rather than the draft. With `deferredApply` off, behaviour is unchanged.

**Breaking:** `onStateChange` now receives the **resolved** `TableState` instead of an
`Updater<TableState>`. Passing the raw updater through would hand the consumer a function that
recomputes from _their_ state and reintroduces the draft. Migrate by dropping the unwrap:

```diff
-onStateChange: (updater) => setTableState((prev) => (typeof updater === 'function' ? updater(prev as TableState) : updater))
+onStateChange: (state) => setTableState(state)
```

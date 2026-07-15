---
'@ez-kit/data-grid-core': minor
---

Remove the `sorting.defaultSorting` prop. It was duplicate sugar over `initialState.sorting`. To set an initial sort, use `initialState.sorting` (TanStack-style), consistent with every other feature's initial state. This is a breaking change — replace `sorting: { defaultSorting: [...] }` with `initialState: { sorting: [...] }`.

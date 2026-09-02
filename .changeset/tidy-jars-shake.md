---
'@ez-kit/data-grid-core': minor
---

Fix the table-level resizing gate and add `globalFiltering.manual`.

- `resizing: false` (or omitting it) now emits `enableColumnResizing: false`, so
  `column.getCanResize()` returns `false` when the feature is off. Previously the else branch
  was empty and TanStack's `true` default leaked through, leaving every column reporting itself
  as resizable with resizing disabled entirely.
- `globalFiltering` gained a `manual` flag, matching `sorting`, `filtering` and `pagination`.
  Server-side global search no longer has to enable `filtering: { manual: true }` — a feature it
  does not use — to switch off client-side re-filtering. TanStack exposes one `manualFiltering`
  switch for both axes, so either flag disables client-side filtering for both; the JSDoc says so.
  `deferredApply` now also accepts `globalFiltering.manual` as its required manual axis.

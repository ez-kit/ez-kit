---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/qc-react': minor
'@ez-kit/query-react': minor
---

Scope connected form drafts, delete confirmations and bulk selection updates to their write owner.
Prevent pre-dispatch deletion after cancellation and show failures from built-in delete actions
while preserving imperative rejection. Keep disabled infinite reads from loading more pages.

Connected grids own query notifications. Remove `notifyOnChangeProps` from grid `queryOptions`
if previously set. Structural reads must provide compatible query options and projections, and
a grid factory can only inherit cursor settings when it has infinite defaults.

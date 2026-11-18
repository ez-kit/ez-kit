---
'@ez-kit/data-grid-react': patch
'@ez-kit/query-react': patch
'@ez-kit/qc-react': patch
---

Scope infinite loader state to the active collection, ignore stale cached totals during page correction,
and support automatic mutations invoked from early consumer effects. Add a neutral loadMoreKey for
base-grid loaders. Enforce safe projections in direct grid helpers and preserve complete observer
option types for structural collection sources.

---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': patch
'@ez-kit/qc-react': patch
---

Use committed options and rows for connected grid writes during concurrent rendering. Block
bulk actions from stale controlled selection after a scope change. Dismiss delete confirmations
without cancelling active deletes, and retain same-scope target reservations until settlement.

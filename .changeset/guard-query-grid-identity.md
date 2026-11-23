---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': patch
'@ez-kit/qc-react': minor
'@ez-kit/query-react': minor
---

Require stable row IDs for connected edit and delete actions. Keep controlled page resets pending,
suppress cross-scope placeholder data before projection, and allow explicit dataset scope keys.
Coalesce pending deletion targets without cancelling independent deletes.

Use prepareKey to separate generated cache identity from non-serializable transport arguments.
Shape-changing native descriptors require an explicit selector, and structural projections must
accept raw data when their selector is optional.

---
'@ez-kit/qc-react': minor
'@ez-kit/query-react': minor
---

Compare each applied grid criterion with Object.is for page resets. Controlled objects and
arrays need stable references until their value changes.

Check raw initial data against the fetcher response and reflect optional selectors in the
collection query result. Infer grid rows from a concrete source to preserve projection and
mode checks instead of supplying only the row type to useDataGrid.

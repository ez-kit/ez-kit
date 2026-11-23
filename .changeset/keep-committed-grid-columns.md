---
'@ez-kit/data-grid-core': patch
'@ez-kit/data-grid-react': patch
'@ez-kit/qc-react': patch
'@ez-kit/query-react': patch
---

Keep connected write actions on the visible grid's columns and callbacks during Suspense, and use
the current visible tree rows for deletion. Hide selection actions until the controlled selection
resets after a scope change. Guard native placeholder data before projection, preserve placeholders
supplied by the new read, and validate every option branch and explicitly configured pagination mode.

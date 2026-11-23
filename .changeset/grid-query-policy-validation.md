---
'@ez-kit/data-grid-core': patch
'@ez-kit/qc-react': patch
---

Expose per-grid query observer options and silently cancel validation when mutation ownership changes.
Add creating/editing cancelValidation to retain form values while abandoning pending checks without
interrupting dispatched saves.

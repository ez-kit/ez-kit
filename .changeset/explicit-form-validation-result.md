---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

Return explicit valid, invalid, or cancelled results from editing/creating validateValues and
FormModalProps.validate. This breaks the previous errors-or-null check result: branch on status
instead. Cancellation now settles promptly even when a validator ignores its signal. Schema
validators and state-writing validate() retain their existing contracts.

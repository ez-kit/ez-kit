---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Rename `OptionsSource` to `OptionSourceRef` — it is the document's reference to a source, not the
source. `OptionSourceInput` and `OptionSourceResult` move to `@ez-kit/form-core` and are still
re-exported from `@ez-kit/form-react` and both kits.

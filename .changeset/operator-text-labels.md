---
'@ez-kit/data-grid-core': major
'@ez-kit/data-grid-react': major
'@ez-kit/data-grid-shadcn': major
'@ez-kit/data-grid-heroui': major
'@ez-kit/data-grid-native': major
---

Show filter operators as English text instead of icon symbols. The `symbol` field is removed from `FilterOperatorDef`, and every operator surface — the operator select (shadcn / heroui / native) and the active-filter chips — now renders `label` (`Contains`, `Greater than`, `Between`…) rather than a glyph (`⊇`, `>`, `↔`). This is a breaking change: drop `symbol` from any custom operator definition, and rely on `label` for the user-facing text.

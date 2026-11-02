---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

Translate the whole grid with one dictionary, and ship English and Russian ones.

- The ready-made filter operators are labelled from `messages.operators`: `common` by id, plus `date` and `boolean` for the wordings that differ ("After", "Is"). A definition's own `label` always wins, and the group is named on the definition (`labels: 'date'`), so a cell type built from the date set reads "After" too.
- `enMessages` and `ruMessages` ship on `@ez-kit/data-grid-core/messages/en` and `/ru`, each the whole `GridMessages`.
- A record inside a dictionary group (`filtering.presets`, `operators.common`) now merges entry by entry, so overriding one preset keeps the others.

**Breaking:** `FilterOperatorDef.label` is optional and the definitions in `defaultOperators` carry none — read a ready-made operator's label with `resolveOperatorLabel(def, messages.operators)`. A translated copy of `defaultOperators` keeps working, since an explicit `label` wins; `messages.operators` replaces it.

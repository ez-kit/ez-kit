---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

`selection.multiple` is now `selection.multi`, and it finally does something.

The option was declared on `SelectionConfig` and documented as "Set `false` to allow only one
selected row", but nothing ever read it: TanStack defaults `enableMultiRowSelection` to `true`,
so a grid configured for single selection kept accumulating rows. `selection: { multi: false }`
now emits `enableMultiRowSelection: false`, so selecting a row clears the previous one, and the
React layer renders no select-all checkbox in the selection column's header — there is nothing
for it to select.

Renamed at the same time to match `sorting.multi`: "more than one of this feature at a time" is
one concept and now spells the same way across the config.

```diff
- selection={{ multiple: false }}
+ selection={{ multi: false }}
```

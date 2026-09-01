---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

feat(form): multi-select and checkbox-group fields

Two new field kinds — `multiselect` and `checkboxgroup` — from the JSX API
(`form.MultiSelectField`, `form.CheckboxGroupField`) and from a schema
(`FormFieldType.MultiSelect`, `FormFieldType.CheckboxGroup`). Both bind to a **`string[]`**
under a single `name`, take the same `options` list as their single-value counterparts, and
complete the selection grid: collapsed vs expanded, one value vs many.

They are separate kinds rather than a `multiple` flag, because the value type differs — which
is what keeps `name` narrowed to `string[]` paths here and `string` paths on `select` /
`radiogroup`. The value is always a list (`[]` when nothing is chosen, never `undefined`).

Validation follows: **an empty list now counts as empty**, so `required` is no longer
satisfied by a multi-select with nothing selected, and `minLength` / `maxLength` measure
entries for a list (characters for a string, as before). `parseFormSchema` rejects a
`defaultValue` that is not an array of option values, and requires `options` on both kinds.

No new dependencies in either kit: HeroUI uses its own `Select` in `selectionMode='multiple'`
and its real `CheckboxGroup`; shadcn — whose Radix select is single-selection only — composes
a popover of vendored checkboxes, the same shape this repo's data-grid kit already uses for
its faceted filter.

**Breaking for custom kits:** `FormComponents` gains `MultiSelectField` and
`CheckboxGroupField`.

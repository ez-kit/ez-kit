---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

**Kit contract:** every field's render props carry `data-form-id`, the id of the form the field
belongs to, and a kit spreads it onto the same element as `data-field`. Both kits do; a custom kit
that picks its props rather than spreading them must add it, or focus-on-error skips its fields.
`form.Field` hands it over too.

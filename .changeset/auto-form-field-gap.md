---
'@ez-kit/data-grid-react': patch
'@ez-kit/data-grid-heroui': patch
---

fix(data-grid): space the fields of a create / edit modal

The generated form stacked its fields as bare `<div>`s with nothing between them, so a label sat
directly under the input above it and, where a column had a `description`, that description read
as belonging to the next field. The shared layer now stamps `data-slot="auto-form"` on the form and
`data-slot="auto-form-field"` on each field — attributes only, no styling — and both kits stack
them with a gap.

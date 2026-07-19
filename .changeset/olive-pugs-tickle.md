---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Lay a checkbox field out as `[control] Label` on one row.

The shared field frame renders chrome in one fixed order — label, description, input, error — which is right for every field except a checkbox, where it left the control stranded under its own label. Both kits now reorder that case themselves, with description and error keeping a full row beneath.

`FieldRootProps` declares the `data-field`, `data-field-type` and `data-invalid` attributes it receives, so a kit can branch on the field kind instead of only matching it from CSS.

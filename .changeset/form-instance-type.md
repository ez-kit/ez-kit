---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Add `FormInstance<TValues>`, the one public type for a form instance. `KitFormApi`, `BoundForm`,
`RendererForm` and `BoundFieldApi` are no longer exported: write `FormInstance<Values>` where you
wrote `KitFormApi<Values, …twelve parameters…>`.

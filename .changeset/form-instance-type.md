---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Add `FormInstance<TValues>`, the one public type for a form instance. `KitFormApi`, `BoundForm`,
`RendererForm` and `BoundFieldApi` are no longer exported: write `FormInstance<Values>` where you
wrote `KitFormApi<Values, …twelve parameters…>`.

An app with custom fields writes `FormInstance<Values, Fields>` where it wrote
`KitFormApi<Values, …twelve parameters…, Fields>`.

`BoundFieldApi` has no new name: to name an array scope's `field`, write
`ArrayFieldScope<Item>['field']`. The controlled `SchemaForm`'s `form` prop is now a `FormInstance` rather than a structural slice of
one: every instance `useForm` returns is still accepted, but a hand-built object carrying only
`handleSubmit` and the field components no longer is.

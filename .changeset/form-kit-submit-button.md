---
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Export `SubmitButton`, the kit's submit button built on `form.Submit`. It reads the form from
context, so it works inside `<Form>` and under a `FormProvider` with no `<form>` element.

Both kits also export the type `NoRegistry`, for naming an empty set in
`FormInstance<V, typeof fields, NoRegistry>`.

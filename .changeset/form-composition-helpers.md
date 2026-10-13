---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

`form.Submit`'s `formErrors` lists the issues a form-level standard schema reports without a path;
it used to print the whole issue record as `[object Object]`. A group from `form.FormGroup` or
`useFormGroup` gains `errors`: the messages its own validators report with no path (issues with a
path show on their fields). `group.state.meta.errors` stays TanStack's raw value.

`withForm`'s `form` prop is optional: a block placed without one takes the form above it (`<Form>`,
`<SchemaForm>` or `FormProvider`), typed by the block's own options — a cast, as
`useFormContext<V>()` is. With neither, it throws a named error.

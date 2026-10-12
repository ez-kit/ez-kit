---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Add a form context. `<Form>` and `<SchemaForm>` provide it, `FormProvider` provides it without
rendering a `<form>` (a form whose `<form>` element sits lower in the tree, or none at all), and
`useFormContext()` reads it — the base form API, for components that do not depend on a particular
form, such as a save bar. `createForm` also returns `FormProvider`.

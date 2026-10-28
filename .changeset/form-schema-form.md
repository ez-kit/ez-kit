---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Rename `FormRenderer` to `SchemaForm`, and its prop types to `SchemaFormControlledProps`,
`SchemaFormUncontrolledProps` and `SharedSchemaFormProps`. It is a form whose children come from a
schema document; the name now pairs with `Form` and with `defineFormSchema`. Behaviour is unchanged.

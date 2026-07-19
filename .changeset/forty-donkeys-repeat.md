---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Add the `@ez-kit/form-*` packages: TanStack Form with dependency-injected UI kits.

`createForm({ components })` returns a `useForm` that is a superset of TanStack Form's —
the instance carries flat, fully-wired field components (`form.TextField`,
`form.NumberField`, `form.TextareaField`, `form.SelectField`, `form.CheckboxField`) plus
`form.SubmitButton` and `form.Form`, while the entire native API (`form.Field`,
`form.Subscribe`, `form.handleSubmit`, `form.state`, `form.AppField`) stays available on
the same object. Each field renders its own label, description, input and error text, and
`name` is narrowed to the paths whose value type fits the field.

- `@ez-kit/form-core` — field kinds, `SelectOption`, validator-error normalisation.
- `@ez-kit/form-react` — the DI contract and field layer, with zero visual styling.
- `@ez-kit/form-shadcn` / `@ez-kit/form-heroui` — the two UI-kit implementations.

Validation is pure pass-through of TanStack Form's native standard-schema validators
(zod / valibot / arktype); there is no custom resolver.

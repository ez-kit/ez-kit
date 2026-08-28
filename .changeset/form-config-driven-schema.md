---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

config-driven forms: render a form from a plain-data `FormSchema`

A form can now be described as data — `{ version: 1, children: [...] }` — and rendered with
`<FormRenderer>` through the very same bound field components the JSX API uses, so a
config-driven form and a hand-written one produce identical DOM. The document is JSON with no
functions anywhere, so the same schema can be authored in TypeScript, stored in a database, or
delivered by a backend.

`@ez-kit/form-core` gains the format and everything that reasons about it: `defineFormSchema`
(curried, so `name` is checked per field kind against your value type), the closed rule
language behind `when` / `disabledWhen` (`compileCondition`), `buildValidator` (schema
constraints → one standard-schema validator, no zod), `visibleFieldNames` /
`stripHiddenValues`, `walkNodes`, `resolveText`, and `parseFormSchema` — the trust boundary a
backend-delivered document passes through, which throws `FormSchemaError` with the offending
node's path.

`@ez-kit/form-react` (and both kits) gain `FormRenderer`, in the same controlled and
uncontrolled modes as `<Form>`, with registries for custom field kinds, value-less blocks and
named validation rules; wizards, when the document's top-level children are `step` nodes; and
the composition helpers `withForm`, `withFieldGroup`, `useFormGroup` and `useFieldGroup`.

The UI-kit contract grows `Section`, `GridItem` and `Wizard` — a breaking change for a
hand-written kit, which must supply the new primitives.

Both kits now also re-export the schema-authoring API of `@ez-kit/form-core`
(`defineFormSchema`, `parseFormSchema`, `FormSchemaError`, `buildValidator`,
`stripHiddenValues` and the `FormSchema` / `FormNode` / `NamedRule` types), so a kit stays the
only package a consumer installs.

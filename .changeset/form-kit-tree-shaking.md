---
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

The kit root now tree-shakes: importing `TextField` and `createForm` no longer pulls the date
picker, the comboboxes or the schema renderer, and importing `Form` no longer pulls the schema
renderer. Every component is exported on its own — the twelve field kinds, `ArrayField`,
`FormElement`, `SubmitButton`, `Section`, `GridItem`, `Wizard` — and `formFieldSlots` /
`formComponents` are renamed `allFormFields` / `allFormComponents`: importing one is a deliberate
"everything".

    export const { useForm, Form } = createForm({
      FormElement,
      fields: { TextField, SelectField, ArrayField },
      components: { SubmitButton, Section },
    })

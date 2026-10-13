---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

**Kit contract:** every field's render props carry `data-form-id`, the id of the form the field
belongs to, and a kit spreads it onto the same element as `data-field`. Both kits do; a custom kit
that picks its props rather than spreading them must add it, or focus-on-error skips its fields.
`form.Field` hands it over too.

**Focus on the first error.** After a submit that fails validation, the first field in DOM order
that has an error takes focus — its control by `id`, or the first focusable element inside it. It
works in a `<form>`, under `FormProvider` alone, and with several forms on one page. `focusOnError:
false` (an option of `useForm`, a prop of the uncontrolled `<Form>` / `<SchemaForm>`) turns it off;
`onSubmitInvalid` still runs, after the focus.

**Server errors.** `form.setServerErrors({ fields, form })` puts errors a server reported onto the
form: `fields` maps a field path to a message or a list of them, `form` holds messages for the form
as a whole. A field's error shows at once, stays when the field is focused and left, and goes the
first time its value changes — it does not come back if the value is changed back. Every server error
goes when the form is submitted again or reset. Afterwards the first field with an error takes focus.
Field errors live in TanStack's `errorMap.onServer`, so every kit renders them unchanged.

`serverErrors` is the declarative form of the same: an option of `useForm` and a prop of the
uncontrolled `<Form>` and `<SchemaForm>`, applied whenever its value changes by reference — the shape
`useActionState` hands back. Messages for the form as a whole arrive in `form.Submit`'s `formErrors`
and do not disable submitting; the next submit clears them.

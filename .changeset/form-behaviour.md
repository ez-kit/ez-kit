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
goes on the next `form.handleSubmit()` or `form.reset()` of the instance `useForm` returns; the core
`formApi` TanStack passes to `onSubmit`, listeners and validators does not clear them. When the errors
name a field, the first field with an error takes focus, unless `focusOnError` is `false`.
Field errors live in TanStack's `errorMap.onServer`, so every kit renders them unchanged.

`serverErrors` is the declarative form of the same: an option of `useForm` and a prop of the
uncontrolled `<Form>` and `<SchemaForm>`, applied whenever its value changes by reference — the shape
`useActionState` hands back. Messages for the form as a whole arrive in `form.Submit`'s `formErrors`
and do not disable submitting; the next submit clears them.

**Searchable sources wait for the user.** A searchable field over an option source hands the source
its query after 300 ms without typing, not on every keystroke; `debounce` and `minLength` on the
source, or `searchable={{ debounce, minLength }}` on the field (and in a schema node), tune it. Below
`minLength` the source receives `query: undefined` and the kit shows a hint. An in-memory searchable
list still filters at once. **Kit contract:** `search` gains `minLength` and `belowMinLength`, and
`loading` is now also `true` while a debounce is pending — on an in-memory list too, once a field sets
`debounce` above 0. A kit that blanks or disables its control on `loading` does so on every pause.

**Migration:** a source that already debounces its query internally now waits twice — drop its own
debounce, or set `debounce: 0` on the source.

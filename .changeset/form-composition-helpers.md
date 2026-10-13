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

Groups carry the bundle's fields. Inside `form.FormGroup` and a `withFieldGroup` block, `group.TextField`,
`group.ArrayField`, `group.Array` and every field the app registered take a `name` relative to the
group — a path for `form.FormGroup` and `fields='…'`, the map's own key for a field map. `form.X`
inside a group stays absolute: the coordinates come from the object a field is called through.
`withFieldGroup` is now built per bundle, and a block placed without `form` takes the form above it,
with `fields` then unchecked; with neither, it throws a named error. Both kits export the new types
`GroupFields`, `FieldGroupScope`, `FormGroupScope`, `FieldGroupPlacementProps`,
`UncheckedFieldGroupPlacementProps`, `WithFieldGroupOptions` and `FieldGroupBlock`.

**Groups validate and submit.** `withFieldGroup` takes `validators` — a Standard Schema or a function
over the block's own shape, on `onMount`, `onChange`, `onBlur`, `onSubmit` and their async forms.
Issues with a path land on the real fields; issues without one are the block's `group.errors`.
`group.handleSubmit()` checks the block and calls the `onGroupSubmit` passed where the block is
placed, with `value` typed by the block. **Breaking:** a block's `group.handleSubmit` used to submit
the whole form; call `form.handleSubmit()` for that. On every group (`form.FormGroup`, `useFormGroup`,
a block), a submit first clears the server errors of the fields inside it, runs the groups placed
inside it, and focuses the group's first error when it fails. A whole-form submit now runs every
mounted group's validators after the fields — before, TanStack ran none of them. Both kits also
export `GroupValidators`, `GroupValidator`, `GroupAsyncValidator` and `OnGroupSubmit`.

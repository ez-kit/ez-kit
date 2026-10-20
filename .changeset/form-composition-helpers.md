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
`useFormContext<V>()` is. With neither, it throws a named error. A `form` that is passed is checked
against the block's data and fields but no longer against its validators: a block declared with
`defaultValues` alone used to reject every form that had been given `validators`.

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
placed, with `value` typed by the block. `meta` is the argument `group.handleSubmit(meta)` was called
with, `undefined` without one. **Breaking:** a block's `group.handleSubmit` used to submit
the whole form; call `form.handleSubmit()` for that. On every group (`form.FormGroup`, `useFormGroup`,
a block), a submit first clears the server errors of the fields inside it, runs the groups placed
inside it, and focuses the group's first error when it fails. A whole-form submit runs the form's
validators and no group's, as in TanStack: the form's schema decides whether the form is sent, so a
rule that must hold the form belongs in it — build it from the blocks' schemas, and describe a part
that is there only sometimes with `z.discriminatedUnion` or `superRefine`. An error a mounted group
has already reported still blocks the form's submit. Both kits also export `GroupValidators`,
`GroupValidator`, `GroupAsyncValidator` and `OnGroupSubmit`.

A group that unmounts — a block behind a checkbox, a step — now takes its errors with it, including
those it put on fields that were never mounted; before, they stayed and kept the form from submitting
for good. A field mounted after a submit attempt shows the errors the form reported on it without
being touched. `revalidateLogic` is re-exported from `@ez-kit/form-react` and both kits, for a form
schema on `onDynamic` that stays quiet until the first submit and re-checks every change after it. In
development, a group whose name begins another field's name (`billing` beside `billingDiffers`) logs
an error: TanStack Form matches a group's fields by a plain prefix, so editing that field runs the
group's validators.
Two native groups on one name — a `form.FormGroup` and a block placed on its path — share one group
state, so keep one validating group per branch: in development, two with validators log an error.

A block placed with a field map — `fields={{ password: 'newPassword', confirm: 'newPasswordRepeat' }}`
— validates and submits the same way: its value is assembled from the mapped fields, issues with a
path land on the mapped field, and its own issues are `group.errors`. Those are kept under an
`errorMap` key of the form `onGroup:<id>`, which `form.Submit`'s `formErrors` leaves out.

---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Every form instance gains `form.NativeField`: TanStack's render-prop field, with its `FieldApi`, under
a new name. It is also on every array entry (`item.NativeField`, item-relative).

Every group gains `NativeField` too: `withFieldGroup` and `useFieldGroup` groups (names mapped
through `fields`), and `form.FormGroup` and `useFormGroup` groups (names relative to the group's
`name`). `useFieldGroup`, `useFormGroup` and the bundle's `withFieldGroup` are now this package's own,
taking the form instance `useForm` returns; they no longer accept a TanStack `FormApi` built
elsewhere, nor a group as another group's `form`.

On a group and on an array entry, `NativeField`'s `name` and its validators' `onChangeListenTo` /
`onBlurListenTo` are relative; the `field` its render prop receives is the root form's, so
`field.name` is the absolute path (`address.city`).

**Breaking:** `form.Field` is no longer TanStack's field. It binds a control of your own the way a
registered field is bound: its render prop receives `id`, `name`, `value`, a value-taking `onChange`,
`onBlur`, `errors` (already filtered by the display rule), `invalid`, `data-field`, … — the props a
`defineFieldType` field gets — and it validates through `validate`, like every field of this package
(TanStack's `validators` stay on `form.NativeField`). It is also on every array entry
(`item.Field`) and every group (`group.Field`), with names relative to them. Code written against
TanStack's `form.Field` (`field.state.value`, `field.handleChange`) moves to `form.NativeField` and
no longer compiles in `form.Field`. Both kits export the new types `FieldProps`, `FieldControlProps`,
`BoundFieldComponent`, `FieldGroupInstance`, `FieldGroupOptions`, `FormGroupInstance` and
`FormGroupProps`.

`form.AppField` is now this package's binding seam — the component every bound field renders
through — and no longer provides TanStack's field context.

---
'@ez-kit/form-react': minor
---

Every form instance gains `form.NativeField`: TanStack's render-prop field, with its `FieldApi`, under
a new name. It is also on every array entry (`item.NativeField`, item-relative).

Every group gains `NativeField` too: `withFieldGroup` and `useFieldGroup` groups (names mapped
through `fields`), and `form.FormGroup` and `useFormGroup` groups (names relative to the group's
`name`). `useFieldGroup`, `useFormGroup` and the bundle's `withFieldGroup` are now this package's own,
taking the form instance `useForm` returns; they no longer accept a TanStack `FormApi` built
elsewhere, nor a group as another group's `form`.

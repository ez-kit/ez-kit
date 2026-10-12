---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

`createForm` takes `{ FormElement?, fields?, components? }`, all optional. `form.X` exists in the
types for exactly what was passed: a field kind under its key, and any component under its key with
its own props — `components: { SaveBar }` gives `<form.SaveBar />`. Without `FormElement` the form
renders a plain `<form>`. A component reads the form from context, so it needs `<Form>`,
`<SchemaForm>` or `<FormProvider>` above it: an instance from `useForm` rendered under a
hand-written `<form>` is wrapped in `<FormProvider form={form}>`, or `form.SubmitButton` throws.
Because `<Form form>` puts its instance in that context, the controlled `form` prop now takes a
whole form instance (`FormInstance<V, NoRegistry, NoRegistry>`, generic over the values) rather than
any object with a `handleSubmit`; every `useForm` result is accepted, and `FormProvider` now also
accepts one whose values hold an array.

Breaking: the `Button` and `Form` slots are gone. Pass the kit's `FormElement` as `FormElement`, and
its `SubmitButton`, `Section`, `GridItem` and `Wizard` in `components`; `form.SubmitButton` is now
the `SubmitButton` you passed. `ArrayScope.Button` is removed — a custom array layout renders its
own buttons. `ButtonProps`, `SectionRenderProps` and `GridItemRenderProps` are no longer exported;
a kit's `Section` and `GridItem` take `SectionProps` and `GridItemProps`. `createForm` no longer
warns about missing slots; `SchemaForm` throws a named error, before it renders anything, when a
document needs a component or a field kind that was not passed — a hidden node or one in a later
wizard step included, so a built-in kind with no slot (`DateField`) or an unregistered custom type
no longer throws `Unknown node type` mid-flow.

Every key of `FormFieldSlots` and `FormComponents` is now optional, so a third-party kit checks
that it ships all of them with `satisfies AllFormFieldSlots` / `satisfies AllFormComponents`. A
field set typed `FormFieldSlots` gives possibly-`undefined` members; a `satisfies`-checked one gives
required members. A misspelt built-in key in `fields` is a type error, and every custom entry is checked against
what the generic binder passes: a hand-written field that types its value
(`(p: CustomFieldRenderProps<number>) => …`) is declared with `defineFieldType` instead. The exported
`FormFieldComponents` holds only the field kinds — `Array` and `Submit` are `FormPrimitives`, and
`SubmitButton`, `Section` and `GridItem` are the components you pass. `FormInstance<V>` defaults to
every field kind and all four components, the shape a kit's bundle has; name `NoRegistry` for an
empty set, as in `FormInstance<V, typeof fields, NoRegistry>`.

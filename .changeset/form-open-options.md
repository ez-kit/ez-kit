---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

`createForm` takes `{ FormElement?, fields?, components? }`, all optional. `form.X` exists in the
types for exactly what was passed: a field kind under its key, and any component under its key with
its own props — `components: { SaveBar }` gives `<form.SaveBar />`. Without `FormElement` the form
renders a plain `<form>`.

Breaking: the `Button` and `Form` slots are gone. Pass the kit's `FormElement` as `FormElement`, and
its `SubmitButton`, `Section`, `GridItem` and `Wizard` in `components`; `form.SubmitButton` is now
the `SubmitButton` you passed. `ArrayScope.Button` is removed — a custom array layout renders its
own buttons. `ButtonProps`, `SectionRenderProps` and `GridItemRenderProps` are no longer exported;
a kit's `Section` and `GridItem` take `SectionProps` and `GridItemProps`. `createForm` no longer
warns about missing slots; `SchemaForm` throws a named error when a document needs a component
that was not passed.

---
'@ez-kit/docs': minor
---

Document the form factory's new shape. The kit contract page now describes `FormElement`, the open
`fields` and `components` registries, the kit's `sets.ts` / `form.tsx` split and the `/* @__PURE__ */`
delegating-export rule; `createSchemaForm` is documented where a schema document reaches a custom
field, and a document that needs a component nobody passed is documented as a named error before the
first render. Submission documents `form.Submit` and its five render props, Composition gains
`FormProvider` / `useFormContext` and the `FormInstance<V, typeof fields, typeof components>`
spelling for a subset, and the arrays API notes that a kit's `ArrayField` carries `ArrayField.Item`.

Native API now documents `form.Field`, which binds a control of your own, and `form.NativeField`,
TanStack's field, on the form, on groups and on array entries; Composition documents the optional
type argument of `useFormContext`.

Submission documents the dirty-state recipes: resetting after a save, late initial values and a
`beforeunload` warning while the form is dirty.

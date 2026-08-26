---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
'@ez-kit/form-core': minor
---

form: a standalone `<Form>` component in two modes, replacing `form.Form`

`<Form>` is now the single place the `<form>` element is rendered, and it comes in two
mutually exclusive modes:

- **uncontrolled** — pass the options `useForm` takes and it runs the hook itself, handing
  the instance to a render prop. The form is created by mounting the element, so unmounting
  it (closing a dialog, switching a record) takes its values, errors and submit state with
  it. `children` is a function because React context cannot carry the form-data generic —
  through context every `name` would degrade to a bare `string`.
- **controlled** — `<Form form={form}>` around an instance from `useForm`, with plain JSX
  children, for when something outside the markup reads the form.

**Breaking:** `form.Form` is gone — render `<Form>` instead. `FormWrapperProps` is replaced
by `FormProps`. Kits now export `Form` alongside `useForm`, and `createForm` returns both.
`@ez-kit/form-core` re-exports `AnyFormOptions`, which the component uses to tell form
options from DOM props.

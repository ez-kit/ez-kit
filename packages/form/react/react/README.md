# @ez-kit/form-react

The React adapter for `@ez-kit/form-*`: a dependency-injection layer over
[TanStack Form](https://tanstack.com/form) that turns a UI kit's primitives into flat,
fully-wired field components hanging off the form instance.

**This package contains zero visual styling.** It renders only the primitives a kit
injects, plus `data-*` attributes for that kit's CSS to target. Install a kit package
(`@ez-kit/form-shadcn`, `@ez-kit/form-heroui`) unless you are building your own.

## The idea

`createForm({ components })` returns a `useForm` that is a **superset** of TanStack Form's:

```tsx
const form = useForm({
	defaultValues: { email: '', age: 0, role: 'user', agree: false },
	validators: { onChange: zodSchema }, // native standard-schema, no custom resolver
	onSubmit: ({ value }) => save(value),
})

<form.Form>
	<form.TextField name='email' label='Email' placeholder='you@example.com' />
	<form.NumberField name='age' label='Age' />
	<form.SelectField name='role' label='Role' options={[{ label: 'User', value: 'user' }]} />
	<form.CheckboxField name='agree' label='I agree' />
	<form.SubmitButton>Save</form.SubmitButton>

	{/* the native TanStack API is untouched on the same instance */}
	<form.Field name='email'>{(field) => <input value={field.state.value} />}</form.Field>
	<form.Subscribe selector={(s) => s.errors}>{(errors) => <pre>{errors.length}</pre>}</form.Subscribe>
</form.Form>
```

Each `*Field` renders label + input + description + error text itself. `name` is narrowed
to the paths in your form data whose value type fits the field, so
`<form.NumberField name='email' />` is a compile error.

## Building a kit

Implement `FormComponents` and hand it to `createForm`:

```tsx
import { createForm } from '@ez-kit/form-react'
import type { FormComponents } from '@ez-kit/form-react'

const components = {
	TextField,
	NumberField,
	TextareaField,
	SelectField,
	CheckboxField,
	Button,
	Form,
} satisfies FormComponents

export const { useForm } = createForm({ components })
```

`satisfies FormComponents` turns a forgotten field into a compile error rather than a
runtime crash. Components are bound by closure at `createForm` time — no runtime provider
is involved.

This package renders **no elements at all** — not even a field wrapper. It hands each kit
one flat props object per field (identity, `label`, `description`, `errors`, `invalid`,
`value`/`onChange`, `onBlur`) and the kit builds the entire tree. That is what lets a
React-Aria kit nest its `Label` / `Description` / `FieldError` inside the field root, where
the library's own id and validation wiring lives, while a plain-DOM kit keeps them as
siblings.

## Styling hooks

Two attributes travel with every field for the kit to spread onto its root, plus one on the
form:

| Attribute         | Where          | Value                                                  |
| ----------------- | -------------- | ------------------------------------------------------ |
| `data-field`      | the kit's root | the field's `name`                                     |
| `data-field-type` | the kit's root | `text` / `number` / `textarea` / `select` / `checkbox` |
| `data-form`       | the `<form>`   | always present                                         |

Accessibility is the kit's to wire, because only the kit knows its markup. The shared layer
supplies the raw material: a stable `id`, the label and description nodes, and the
normalised `errors`.

## License

MIT

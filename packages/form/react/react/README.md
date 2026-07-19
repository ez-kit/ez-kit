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
	FieldRoot,
	Label,
	Description,
	ErrorText, // chrome
	TextInput,
	NumberInput,
	Textarea,
	Select,
	Checkbox, // inputs
	Button,
	Form, // form level
} satisfies FormComponents

export const { useForm } = createForm({ components })
```

`satisfies FormComponents` turns a forgotten primitive into a compile error rather than a
runtime crash. Components are bound by closure at `createForm` time — no runtime provider
is involved.

## Styling hooks

The wrappers emit, and never style:

| Attribute         | Where        | Value                                                  |
| ----------------- | ------------ | ------------------------------------------------------ |
| `data-field`      | `FieldRoot`  | the field's `name`                                     |
| `data-field-type` | `FieldRoot`  | `text` / `number` / `textarea` / `select` / `checkbox` |
| `data-invalid`    | `FieldRoot`  | `true` while the field has errors                      |
| `data-form`       | the `<form>` | always present                                         |

Accessibility is wired for you: the label's `htmlFor` and the input's `id` are the field
name, and `aria-describedby` points at the description and error nodes.

## License

MIT

# @ez-kit/form-react

The React adapter for `@ez-kit/form-*`: a dependency-injection layer over
[TanStack Form](https://tanstack.com/form) that turns a UI kit's primitives into flat,
fully-wired field components hanging off the form instance.

**This package contains zero visual styling.** It renders only the primitives a kit
injects, plus `data-*` attributes for that kit's CSS to target. Install a kit package
(`@ez-kit/form-shadcn`, `@ez-kit/form-heroui`) unless you are building your own.

## The idea

`createForm({ components })` returns `{ useForm, Form, FormRenderer, withForm, withFieldGroup }`. `<Form>` is the `<form>` element:
give it the options TanStack's `useForm` takes and it hands you an instance that is a
**superset** of TanStack's — flat fields on top, the whole native API untouched underneath.

```tsx
<Form
	defaultValues={{ email: '', age: 0, role: 'user', agree: false }}
	validators={{ onChange: zodSchema }} // native standard-schema, no custom resolver
	onSubmit={({ value }) => save(value)}
>
	{(form) => (
		<>
			<form.TextField
				name='email'
				label='Email'
				placeholder='you@example.com'
			/>
			<form.NumberField
				name='age'
				label='Age'
			/>
			<form.SelectField
				name='role'
				label='Role'
				options={[{ label: 'User', value: 'user' }]}
			/>
			<form.CheckboxField
				name='agree'
				label='I agree'
			/>
			<form.SubmitButton>Save</form.SubmitButton>

			{/* the native TanStack API is untouched on the same instance */}
			<form.Field name='email'>{(field) => <input value={field.state.value} />}</form.Field>
			<form.Subscribe selector={(s) => s.errors}>{(errors) => <pre>{errors.length}</pre>}</form.Subscribe>
		</>
	)}
</Form>
```

The form is created by mounting the element, so unmounting it — closing a dialog — takes the
state with it. When the instance is needed outside the markup, call `useForm` yourself and
pass it in: `<Form form={form}>` with plain JSX children.

Each `*Field` renders label + input + description + error text itself. `name` is narrowed
to the paths in your form data whose value type fits the field, so
`<form.NumberField name='email' />` is a compile error.

## Composition

`withForm` extracts part of a form into its own component. It is TanStack's helper, retyped
so the flat fields compile inside the block — the `form` a block receives is exactly the
instance `useForm` returns.

```tsx
const AddressBlock = withForm({
	defaultValues: { street: '', city: '' },
	render: ({ form }) => (
		<>
			<form.TextField
				name='street'
				label='Street'
			/>
			<form.TextField
				name='city'
				label='City'
			/>
		</>
	),
})
```

**The options are required, not optional.** `defaultValues` (or another option pinning the
shape) is the only inference site for the block's form data: `withForm({ render })` infers it
as `unknown`, which collapses the legal field names to `never` — nothing is writable inside
such a block, and no real form is assignable to it from outside.

`withFieldGroup`, and the re-exported `useFormGroup` / `useFieldGroup`, yield a **group** API,
which correctly carries no flat field components — inside a group, fields are written with the
native `form.Field` / `form.AppField`.

## Config-driven forms

`<FormRenderer schema={…} />` renders a plain-data
[`FormSchema`](https://ez-kit.dev/docs/form/schema) — the same document a backend can deliver
as JSON — through the very same bound field components, so a config-driven form and a
hand-written one produce identical DOM.

```tsx
<FormRenderer
	schema={schema}
	fields={{ rating: RatingField }} // custom field kinds, by node `type`
	blocks={{ 'promo-banner': Promo }} // value-less markup, by node `component`
	rules={{ 'ru-inn': isValidInn }} // named validation rules
	onSubmit={({ value }) => save(value)}
/>
```

It takes the same two modes as `<Form>`: pass `form` and it binds into an instance you own;
pass `useForm`'s options and it owns the instance. Only in that second mode can it own the
validator built from the schema's `validate` blocks, strip hidden fields out of the submitted
value (opt out with `keepHiddenValues`), and resolve `rules` — a controlled caller does all
three themselves with `buildValidator` and `stripHiddenValues` from `@ez-kit/form-core`.

The format itself, `defineFormSchema` and the `parseFormSchema` trust boundary live in
[`@ez-kit/form-core`](../../../core/README.md).

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
	SwitchField,
	RadioGroupField,
	SliderField,
	Button,
	Form,
	Section,
	GridItem,
	Wizard,
} satisfies FormComponents

export const { useForm, FormRenderer, withForm, withFieldGroup } = createForm({ components })
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

| Attribute         | Where          | Value                                                                                                                                  |
| ----------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `data-field`      | the kit's root | the field's `name`                                                                                                                     |
| `data-field-type` | the kit's root | the node's `type` — `text`, `number`, `textarea`, `select`, `checkbox`, `switch`, `radiogroup`, `slider`, or a custom field's own kind |
| `data-form`       | the `<form>`   | always present                                                                                                                         |

Accessibility is the kit's to wire, because only the kit knows its markup. The shared layer
supplies the raw material: a stable `id`, the label and description nodes, and the
normalised `errors`.

`errors` and `invalid` are reported only once the field has been touched — changed, blurred,
or swept up by a submit attempt. The schema's constraints compile into a single **form-level**
validator, so it always runs against every field; without this gate the first keystroke
anywhere would redden every empty required field in the document. Only display is gated: the
validator still runs on every change, so `canSubmit` is unaffected, and a submit attempt marks
every field touched and therefore surfaces everything.

## License

MIT

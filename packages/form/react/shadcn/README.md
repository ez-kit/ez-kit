# @ez-kit/form-shadcn

The shadcn flavour of `@ez-kit/form-*` — [TanStack Form](https://tanstack.com/form) with
shadcn-styled fields wired for you.

## Install

```bash
pnpm add @ez-kit/form-shadcn
```

The kit ships no stylesheet — your app owns its shadcn theme (`npx shadcn init`). Add one
line to the CSS file that holds it, so Tailwind v4 generates the kit's classes:

```css
@source '../node_modules/@ez-kit/form-shadcn/dist/**/*.js';
```

## Usage

`useForm` is a superset of TanStack Form's: the instance carries flat, fully-wired field
components, and the entire native API stays available on the same object.

```tsx
import { Form } from '@ez-kit/form-shadcn'

function ProfileForm() {
	return (
		<Form
			defaultValues={{ email: '', age: 0, role: 'user', agree: false }}
			validators={{ onChange: profileSchema }} // native standard-schema (zod / valibot / arktype)
			onSubmit={({ value }) => save(value)}
		>
			{(form) => (
				<>
					<form.TextField
						name='email'
						label='Email'
						description='Work address'
					/>
					<form.NumberField
						name='age'
						label='Age'
						min={0}
					/>
					<form.SelectField
						name='role'
						label='Role'
						options={[
							{ label: 'User', value: 'user' },
							{ label: 'Admin', value: 'admin' },
						]}
					/>
					<form.CheckboxField
						name='agree'
						label='I agree to the terms'
					/>
					<form.SubmitButton>Save</form.SubmitButton>
				</>
			)}
		</Form>
	)
}
```

`<Form>` is the `<form>` element and creates the instance, so it lives exactly as long as
the element — mount it inside a dialog and closing the dialog resets the form. When the
instance is needed outside the markup, call `useForm` yourself and pass it in:
`<Form form={form}>` with plain JSX children.

Each field renders its own label, description, input and error text. `name` is narrowed to
the paths whose value type fits the field, so `<form.NumberField name='email' />` will not
compile.

### v1 field set

`TextField`, `NumberField`, `TextareaField`, `SelectField`, `CheckboxField`, plus
`SubmitButton` (built on `form.Submit`, subscribed to `canSubmit` / `isSubmitting`), plus the standalone `Form`
element wired to `handleSubmit`.

### Assembling your own

`createForm` and `createSchemaForm` are re-exported with the kit's sets beside them — `FormElement`,
`allFormFields`, `allFormComponents` and every component by name — so an app registers a field kind
of its own, or only the fields it renders, without forking the kit. Pass `FormElement` when you do.
`FormProvider` and `useFormContext` are exported too: `form.SubmitButton` and any component you
register read the form from context, which `<Form>`, `<SchemaForm>` or `<FormProvider form={form}>`
sets.

### Layout

`form.Section` groups fields under an optional heading, `form.Grid` lays children out on a
`columns`-wide grid (1–4), and `form.Grid.Item` gives one child a wider `colSpan`. They are the
JSX spelling of a document's `Section` block, its `columns` and a node's `colSpan` — pure layout,
binding no value.

### Native API

`form.Field` binds a control of your own like a registered field — `value`, a value-taking
`onChange`, `errors`, `invalid`, `id` — and `form.NativeField` is TanStack's render-prop field.
`form.Subscribe`, `form.handleSubmit` and `form.state` are TanStack's, untouched.

## Package layout

- `src/components/ui/**` — vendored shadcn primitives, **immutable** (see `CLAUDE.md`).
- `src/blocks/**` — the adapters that implement the `@ez-kit/form-react` contract.
- `src/sets.ts` — `allFormFields` / `allFormComponents`, every block in the two bags `createForm` takes.
- `src/form.tsx` — the prebuilt bundle (`useForm`, `Form`, `SchemaForm`, …) built from those sets.

## License

MIT

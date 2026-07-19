# @ez-kit/form-shadcn

The shadcn flavour of `@ez-kit/form-*` — [TanStack Form](https://tanstack.com/form) with
shadcn-styled fields wired for you.

## Install

```bash
pnpm add @ez-kit/form-shadcn
```

Import the stylesheet once at your app root:

```ts
import '@ez-kit/form-shadcn/global.css'
```

## Usage

`useForm` is a superset of TanStack Form's: the instance carries flat, fully-wired field
components, and the entire native API stays available on the same object.

```tsx
import { useForm } from '@ez-kit/form-shadcn'

function ProfileForm() {
	const form = useForm({
		defaultValues: { email: '', age: 0, role: 'user', agree: false },
		validators: { onChange: profileSchema }, // native standard-schema (zod / valibot / arktype)
		onSubmit: ({ value }) => save(value),
	})

	return (
		<form.Form>
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
		</form.Form>
	)
}
```

Each field renders its own label, description, input and error text. `name` is narrowed to
the paths whose value type fits the field, so `<form.NumberField name='email' />` will not
compile.

### v1 field set

`TextField`, `NumberField`, `TextareaField`, `SelectField`, `CheckboxField`, plus
`SubmitButton` (subscribed to `canSubmit` / `isSubmitting`) and `Form` (a `<form>` wired to
`handleSubmit`).

### Native API

`form.Field`, `form.Subscribe`, `form.handleSubmit`, `form.state` and `form.AppField` are
untouched — reach for them whenever a field needs bespoke markup.

## Package layout

- `src/components/ui/**` — vendored shadcn primitives, **immutable** (see `CLAUDE.md`).
- `src/blocks/**` — the adapters that implement the `@ez-kit/form-react` contract.
- `src/form.tsx` — `createForm({ components })`, where the two meet.

## License

MIT

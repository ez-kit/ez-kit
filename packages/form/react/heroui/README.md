# @ez-kit/form-heroui

The HeroUI flavour of `@ez-kit/form-*` — [TanStack Form](https://tanstack.com/form) with
HeroUI v3 (React Aria) fields wired for you.

## Install

```bash
pnpm add @ez-kit/form-heroui @heroui/react @heroui/styles
```

`@heroui/react` and `@heroui/styles` (v3) are peer dependencies — React Aria's fields reach
their controls through React context, so a second copy in your tree would break the
compositions.

The kit ships no stylesheet. In your app's CSS:

```css
@import '@heroui/styles';
@source '../node_modules/@ez-kit/form-heroui/dist/**/*.js';
```

The `@source` line is what makes Tailwind generate the kit's classes — it does not scan
`node_modules` on its own. HeroUI v3 requires Tailwind CSS v4.

## Usage

`useForm` is a superset of TanStack Form's: the instance carries flat, fully-wired field
components, and the entire native API stays available on the same object.

```tsx
import { useForm } from '@ez-kit/form-heroui'

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

The API is identical to `@ez-kit/form-shadcn` — the same example renders under either kit.

### v1 field set

`TextField`, `NumberField`, `TextareaField`, `SelectField`, `CheckboxField`, plus
`SubmitButton` (subscribed to `canSubmit` / `isSubmitting`) and `Form`.

## Notes on the HeroUI v3 mapping

HeroUI v3 fields are React Aria **compositions**: a state-owning root wraps the control,
and label / description / error are normally its children. The shared field layer instead
renders chrome as siblings of the input, so the adapters in `src/blocks/`:

- pass `aria-labelledby` and `aria-describedby` explicitly, because React Aria cannot see a
  label that is not its child (composite widgets such as the select trigger and the
  number-field group would otherwise go unlabelled);
- render error text as a plain danger-token element rather than HeroUI's `FieldError`,
  which requires the enclosing field context;
- use a plain `<form>` rather than HeroUI's `Form`, since TanStack Form owns submission and
  validation reporting.

## License

MIT

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
import { Form } from '@ez-kit/form-heroui'

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

The API is identical to `@ez-kit/form-shadcn` — the same example renders under either kit.

### v1 field set

`TextField`, `NumberField`, `TextareaField`, `SelectField`, `CheckboxField`, plus
`SubmitButton` (built on `form.Submit`, subscribed to `canSubmit` / `isSubmitting`) and `Form`.

### Assembling your own

`createForm` and `createSchemaForm` are re-exported with the kit's sets beside them — `FormElement`,
`allFormFields`, `allFormComponents` and every component by name — so an app registers a field kind
of its own, or only the fields it renders, without forking the kit. Pass `FormElement` when you do.
`FormProvider` and `useFormContext` are exported too: `form.SubmitButton` and any component you
register read the form from context, which `<Form>`, `<SchemaForm>` or `<FormProvider form={form}>`
sets.

### Layout

`form.Section` groups fields under an optional heading on a `columns`-wide grid (1–4), and
`form.GridItem` gives one child a wider `colSpan`. They are the JSX spelling of the schema's
`section` node and its `colSpan` — pure layout, binding no value.

## Notes on the HeroUI v3 mapping

HeroUI v3 fields are React Aria **compositions**: a state-owning root wraps the control,
and label / description / error are its children. The adapters in `src/blocks/` follow that
anatomy, so:

- label, description and error sit **inside** the field root, and React Aria derives the
  control's `id`, `aria-labelledby` and `aria-describedby` itself (`blocks/field-state.ts`);
- error text is HeroUI's own `<FieldError>`, fed by the root's validation state
  (`blocks/field-chrome.tsx`);
- render HeroUI's `Form` as the `<form>` element (the kit's `FormElement`, with
  `validationBehavior='aria'`), so the fields sit inside React Aria's form context while TanStack
  Form still owns submission and validation reporting.

## License

MIT

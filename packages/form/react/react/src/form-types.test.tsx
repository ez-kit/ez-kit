import { defineFormSchema, FormFieldType } from '@ez-kit/form-core'
import { describe, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields } from './test-kit'

import type { CustomFieldRenderProps } from './schema/registries'
import type { FormSchema } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

type Values = { email: string; age: number }

const DEFAULTS: Values = { email: '', age: 0 }

const { useForm, Form, FormRenderer } = createForm({ components: testComponents, fields: testFields })

/**
 * Type-level guarantees of `<Form>`. Nothing here is rendered — a violation fails
 * `typecheck`, which is the point: the render prop exists precisely so the `TFormData`
 * generic survives into the fields, and a silent fallback to `unknown` would look
 * identical at runtime.
 */
describe('Form — types', () => {
	it('infers the form data from defaultValues in the render prop', () => {
		function Inferred(): ReactNode {
			return (
				<Form defaultValues={DEFAULTS}>
					{(form) => {
						expectTypeOf(form.state.values).toEqualTypeOf<Values>()

						return (
							<form.TextField
								name='email'
								label='Email'
							/>
						)
					}}
				</Form>
			)
		}

		expectTypeOf(Inferred).toBeFunction()
	})

	it('rejects a name whose value type does not match the field', () => {
		function WrongKind(): ReactNode {
			return (
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<form.NumberField
							// @ts-expect-error — `email` is a string, not a number
							name='email'
							label='Email'
						/>
					)}
				</Form>
			)
		}

		expectTypeOf(WrongKind).toBeFunction()
	})

	it('rejects a name that is not a path in the form data', () => {
		function MissingPath(): ReactNode {
			return (
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<form.TextField
							// @ts-expect-error — no such path in the form data
							name='emial'
							label='Email'
						/>
					)}
				</Form>
			)
		}

		expectTypeOf(MissingPath).toBeFunction()
	})

	it('rejects mixing an instance with inline options', () => {
		function Mixed(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form
					form={form}
					// @ts-expect-error — controlled and uncontrolled are mutually exclusive
					defaultValues={DEFAULTS}
				>
					<span />
				</Form>
			)
		}

		expectTypeOf(Mixed).toBeFunction()
	})
})

/**
 * The field registry has exactly one registration site, `createForm({ fields })`. `FormRenderer`
 * used to take a per-form `fields` prop that layered over it; it was removed, so a caller still
 * passing one has to hear about it at compile time rather than have the object silently land on
 * the `<form>` element as an unknown attribute.
 *
 * The check is structural, not a lint rule: `FormElementRest` is
 * `ComponentPropsWithoutRef<'form'>` minus three keys and carries no index signature, so `fields`
 * is an excess property. Neither overload accepts it, so TypeScript reports the failure on the
 * attribute itself — which is where the directive has to sit.
 */
describe('FormRenderer — types', () => {
	it('rejects a per-form `fields` registry', () => {
		const schema: FormSchema<Values> = { version: 1, children: [] }
		const Rating = (_props: CustomFieldRenderProps): ReactNode => null

		function WithFieldsProp(): ReactNode {
			return (
				<FormRenderer
					schema={schema}
					// @ts-expect-error — the `fields` prop is gone; register on `createForm({ fields })`
					fields={{ rating: Rating }}
					defaultValues={DEFAULTS}
					onSubmit={() => {}}
				/>
			)
		}

		expectTypeOf(WithFieldsProp).toBeFunction()
	})
})

/**
 * `TValues` reaches `FormRenderer` from the schema, not only from `defaultValues`.
 *
 * `defaultValues` used to be the sole inference site, because a node mentions `TValues` only
 * inside `DeepKeysOfType<TValues, …>` — a conditional type inference cannot run backwards
 * through. A backend-delivered document is exactly the case with no `defaultValues` to pin it
 * (`schemaDefaultValues` builds them from the schema), so `onSubmit`'s `value` arrived as
 * `unknown` precisely where the schema was the only thing that knew the shape.
 */
describe('FormRenderer — value inference', () => {
	it('infers the value type from the schema with no defaultValues', () => {
		const schema = defineFormSchema<Values>()({
			version: 1,
			children: [{ type: FormFieldType.Text, name: 'email' }],
		})

		function FromSchema(): ReactNode {
			return (
				<FormRenderer
					schema={schema}
					onSubmit={({ value }) => {
						expectTypeOf(value).toEqualTypeOf<Values>()
					}}
				/>
			)
		}

		expectTypeOf(FromSchema).toBeFunction()
	})

	it('still rejects defaultValues that disagree with the schema', () => {
		const schema = defineFormSchema<Values>()({
			version: 1,
			children: [{ type: FormFieldType.Text, name: 'email' }],
		})

		function Disagreeing(): ReactNode {
			return (
				// The directive sits on the element, not on the attribute: with `TValues` now
				// fixed by the schema, a disagreeing `defaultValues` fails *overload
				// resolution* — both modes are rejected and the error is reported on the JSX
				// element, not as an excess property on the offending prop.
				// @ts-expect-error — the schema says Values; this is a different shape
				<FormRenderer
					schema={schema}
					defaultValues={{ nope: true }}
					onSubmit={() => {}}
				/>
			)
		}

		expectTypeOf(Disagreeing).toBeFunction()
	})
})

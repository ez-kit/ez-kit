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

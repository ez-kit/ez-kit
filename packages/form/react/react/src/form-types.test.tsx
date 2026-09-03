import { describe, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents } from './test-kit'

import type { ReactNode } from 'react'

type Values = { email: string; age: number }

const DEFAULTS: Values = { email: '', age: 0 }

const { useForm, Form } = createForm({ components: testComponents })

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

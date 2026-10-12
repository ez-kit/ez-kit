import { describe, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields } from './test-kit'

import type { FormInstance } from './index'
import type { ReactNode } from 'react'

type Values = { email: string; age: number }
const DEFAULTS: Values = { email: '', age: 0 }

const { useForm } = createForm({ components: testComponents, fields: testFields })

/**
 * `FormInstance` is the one name an app writes for "a form of this shape" — a prop of a component
 * that receives one, say. TanStack's `FormApi` is invariant in its twelve validator parameters, so
 * an alias that defaults them to `undefined | FormValidateOrFn<…>` rejects every instance that has
 * validators. These tests are the reason the defaults are `any`.
 */
describe('FormInstance', () => {
	it('accepts an instance with no validators', () => {
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			expectTypeOf(form).toExtend<FormInstance<Values>>()
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('accepts an instance with sync and async validators', () => {
		function Probe(): ReactNode {
			const form = useForm({
				defaultValues: DEFAULTS,
				validators: {
					onChange: ({ value }) => (value.email === '' ? 'Required' : undefined),
					onSubmitAsync: () => Promise.resolve(undefined),
				},
			})
			expectTypeOf(form).toExtend<FormInstance<Values>>()
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('keeps values and field names typed', () => {
		function Consumer({ form }: { form: FormInstance<Values> }): ReactNode {
			expectTypeOf(form.state.values).toEqualTypeOf<Values>()
			return (
				<>
					<form.TextField name='email' />
					{/* @ts-expect-error — not a path of Values */}
					<form.TextField name='nope' />
				</>
			)
		}
		expectTypeOf(Consumer).toBeFunction()
	})
})

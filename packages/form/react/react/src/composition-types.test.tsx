import { describe, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents } from './test-kit'

import type { ReactNode } from 'react'

type Values = { email: string; address: { city: string } }

const DEFAULTS: Values = { email: '', address: { city: '' } }

const { useForm, withForm, withFieldGroup } = createForm({ components: testComponents })

/**
 * Spec §12. Nothing here is rendered — every assertion is checked by `typecheck`, which is
 * the point: a bare re-export of TanStack's `withForm` types the render prop's `form` as
 * `AppFieldExtendedReactFormApi<…>`, so `form.TextField` would fail to compile while working
 * perfectly at runtime. Only a type-level test catches that.
 */
describe('withForm — types', () => {
	it('exposes the kit field components on the render prop form', () => {
		const EmailBlock = withForm({
			defaultValues: DEFAULTS,
			render: ({ form }) => {
				expectTypeOf(form.TextField).toBeFunction()
				expectTypeOf(form.SubmitButton).toBeFunction()

				return (
					<form.TextField
						name='email'
						label='Email'
					/>
				)
			},
		})

		expectTypeOf(EmailBlock).toBeFunction()
	})

	it('keeps the native TanStack API and the data generic on the render prop form', () => {
		const NativeBlock = withForm({
			defaultValues: DEFAULTS,
			render: ({ form }) => {
				expectTypeOf(form.state.values).toEqualTypeOf<Values>()
				expectTypeOf(form.Field).toBeFunction()
				expectTypeOf<typeof form.handleSubmit>().toBeFunction()

				return null
			},
		})

		expectTypeOf(NativeBlock).toBeFunction()
	})

	it('still rejects a field name the form data does not have', () => {
		const Rejecting = withForm({
			defaultValues: DEFAULTS,
			render: ({ form }) => (
				<form.TextField
					// @ts-expect-error — 'nope' is not a key of Values
					name='nope'
					label='Nope'
				/>
			),
		})

		expectTypeOf(Rejecting).toBeFunction()
	})

	it('passes the caller-declared extra render props through', () => {
		const WithProps = withForm({
			defaultValues: DEFAULTS,
			props: { heading: '' },
			render: ({ form, heading }) => {
				expectTypeOf(heading).toEqualTypeOf<string>()
				expectTypeOf(form.TextField).toBeFunction()

				return null
			},
		})

		expectTypeOf(WithProps).toBeFunction()
	})
})

/**
 * `withFieldGroup`'s render prop receives a **group** API, which correctly carries no flat
 * field components — spec §12 calls that native-`form.Field` territory. What has to hold is
 * that the component it returns still accepts a kit form instance as its parent `form`.
 */
describe('withFieldGroup — types', () => {
	it('accepts a kit form instance as the parent form', () => {
		const AddressGroup = withFieldGroup({
			defaultValues: { city: '' },
			render: ({ group }) => {
				expectTypeOf(group.Field).toBeFunction()

				return null
			},
		})

		function Parent(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<AddressGroup
					form={form}
					fields='address'
				/>
			)
		}

		expectTypeOf(Parent).toBeFunction()
	})
})

import { describe, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents } from './test-kit'

import type { KitWithFormProps } from './composition'
import type { NoInjectedComponents } from './kit-form'
import type { WithFormProps } from '@tanstack/react-form'
import type { ReactNode } from 'react'

type Values = { email: string; address: { city: string } }

const DEFAULTS: Values = { email: '', address: { city: '' } }

const { useForm, withForm, withFieldGroup } = createForm({ components: testComponents })

/**
 * Spec §12. Nothing here executes — every assertion is checked by `typecheck`, which is the
 * point: a bare re-export of TanStack's `withForm` types the render prop's `form` as
 * `AppFieldExtendedReactFormApi<…>`, so `form.TextField` would fail to compile inside a block
 * while working perfectly at runtime. Only a type-level test catches that.
 *
 * Every block is **rendered** from a parent component rather than merely asserted to be a
 * function: `expectTypeOf(Block).toBeFunction()` holds for a block whose props are
 * uninhabitable too, so it is the `<Block form={form} />` call site — and only that — which
 * constrains the returned component's prop type.
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

		function Parent(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })

			return <EmailBlock form={form} />
		}

		expectTypeOf(Parent).toBeFunction()
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

		function Parent(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })

			return <NativeBlock form={form} />
		}

		expectTypeOf(Parent).toBeFunction()
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

		function Parent(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })

			return <Rejecting form={form} />
		}

		expectTypeOf(Parent).toBeFunction()
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

		function Parent(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<WithProps
					form={form}
					heading='Contact'
				/>
			)
		}

		expectTypeOf(Parent).toBeFunction()
	})

	/**
	 * The wrapper hands its options to TanStack through an `as never` cast (`create-form.tsx`),
	 * which launders the type identity: nothing else checks that our option shape still matches
	 * theirs. This is that check — a TanStack minor that adds or renames an option fails here
	 * rather than at a consumer's call site. `render` is excluded on purpose: substituting
	 * `KitFormApi` for `AppFieldExtendedReactFormApi` in it is the whole reason the wrapper
	 * exists.
	 */
	it('keeps the option shape assignable to TanStack’s WithFormProps', () => {
		type KitOptions = Omit<
			KitWithFormProps<
				Values,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				never,
				Record<never, never>
			>,
			'render'
		>

		type TanStackOptions = Omit<
			WithFormProps<
				Values,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				never,
				NoInjectedComponents,
				NoInjectedComponents,
				Record<never, never>
			>,
			'render'
		>

		expectTypeOf<KitOptions>().toExtend<TanStackOptions>()
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

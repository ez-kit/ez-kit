'use client'

import { useState } from 'react'

import { Form, useForm } from 'shared/form/FormKit'

type Address = {
	street: string
	city: string
	postcode: string
}

type Checkout = {
	email: string
	billing: Address
	shipping: Address
}

const EMPTY_ADDRESS: Address = { street: '', city: '', postcode: '' }

const DEFAULT_CHECKOUT: Checkout = { email: '', billing: EMPTY_ADDRESS, shipping: EMPTY_ADDRESS }

/**
 * The form as a named hook, so the instance it returns has a name too.
 *
 * `CheckoutForm` below is that return type, and it is what a reusable block declares its
 * `form` prop as — the block then knows which paths exist and that the flat field
 * components hang off the instance. This is `KitFormApi` under a shorter name; deriving it
 * rather than writing the twelve generic arguments out keeps it in step with the options.
 */
function useCheckoutForm(onSave: (value: Checkout) => void) {
	return useForm({
		defaultValues: DEFAULT_CHECKOUT,
		onSubmit: ({ value }) => {
			onSave(value)
		},
	})
}

type CheckoutForm = ReturnType<typeof useCheckoutForm>

/**
 * One block of fields, written once and rendered twice.
 *
 * The `form` prop is what makes it work: hand a block the instance and `form.TextField`
 * inside it is the same component, checked against the same value type, as at the top level
 * — `name='shipping.city'` is a compile error the moment `shipping` loses its `city`.
 *
 * A kit ships this pattern as `withForm`, which infers the type for you:
 *
 * ```tsx
 * const AddressBlock = withForm({
 *   defaultValues: DEFAULT_CHECKOUT,
 *   props: { path: 'billing' as AddressPath, heading: '' },
 *   render: ({ form, path, heading }) => …,
 * })
 * ```
 *
 * The form options are required there, not decorative: `defaultValues` is the only place the
 * block's data type can be inferred from, and a block written as `withForm({ render })`
 * infers `unknown` — which leaves no writable field name inside it and nothing assignable to
 * it from outside. `withForm` is created per kit by `createForm`, so it is imported from your
 * kit alongside `useForm`; this example declares the prop by hand because it is rendered
 * under two kits at once.
 *
 * `withFieldGroup` is the other half of the pair, for a block that should be reusable across
 * *different* forms: it is written against the group's own shape (`Address`) and mapped onto
 * a parent path at the call site (`<AddressGroup form={form} fields='shipping' />`). The
 * trade is deliberate — a group API carries the native `group.Field`, not the flat field
 * components, because a group has no idea what the surrounding form's value type is.
 */
type AddressPath = 'billing' | 'shipping'

function AddressBlock({ form, path, heading }: { form: CheckoutForm; path: AddressPath; heading: string }) {
	return (
		<fieldset className='flex flex-col gap-4 rounded-md border border-black/10 p-4 dark:border-white/15'>
			<legend className='px-1 text-sm font-medium'>{heading}</legend>
			<form.TextField
				name={`${path}.street`}
				label='Street'
			/>
			<form.TextField
				name={`${path}.city`}
				label='City'
			/>
			<form.TextField
				name={`${path}.postcode`}
				label='Postcode'
			/>
		</fieldset>
	)
}

export function CompositionExample() {
	const [saved, setSaved] = useState<Checkout | null>(null)
	const form = useCheckoutForm(setSaved)

	return (
		<div className='flex flex-col gap-4'>
			<Form form={form}>
				<form.TextField
					name='email'
					label='Email'
					placeholder='you@example.com'
				/>
				<AddressBlock
					form={form}
					path='billing'
					heading='Billing address'
				/>
				<AddressBlock
					form={form}
					path='shipping'
					heading='Shipping address'
				/>
				<form.SubmitButton>Place order</form.SubmitButton>
			</Form>

			{saved ? (
				<pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{JSON.stringify(saved, null, 2)}</pre>
			) : null}
		</div>
	)
}

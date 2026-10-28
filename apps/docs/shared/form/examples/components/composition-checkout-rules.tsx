'use client'

import { useState } from 'react'
import { z } from 'zod'

import { Button } from 'shared/form/Button'
import { Form, revalidateLogic, withFieldGroup, withForm } from 'shared/form/FormKit'

type Address = { street: string; city: string; zip: string }

type Checkout = {
	email: string
	shipping: Address
	separateBilling: boolean
	billing: Address
	payment: { card: string; cvc: string }
}

type Sent = { to: string; value: unknown }

const EMPTY_ADDRESS: Address = { street: '', city: '', zip: '' }

const CHECKOUT_DEFAULTS: Checkout = {
	email: '',
	shipping: { ...EMPTY_ADDRESS },
	separateBilling: false,
	billing: { ...EMPTY_ADDRESS },
	payment: { card: '', cvc: '' },
}

const addressSchema = z.object({
	street: z.string().min(1, 'Enter a street'),
	city: z.string().min(1, 'Enter a city'),
	zip: z.string().regex(/^\d{5}$/, 'Five digits'),
})

const cardSchema = z.object({
	card: z.string().regex(/^\d{16}$/, 'Sixteen digits'),
	cvc: z.string().regex(/^\d{3}$/, 'Three digits'),
})

const addressShape = z.object({ street: z.string(), city: z.string(), zip: z.string() })

const checkoutSchema = z.intersection(
	z.object({
		email: z.email('Enter a valid email address'),
		shipping: addressSchema,
		payment: cardSchema,
	}),
	z.discriminatedUnion('separateBilling', [
		z.object({ separateBilling: z.literal(false), billing: addressShape }),
		z.object({ separateBilling: z.literal(true), billing: addressSchema }),
	]),
)

const AddressFields = withFieldGroup({
	defaultValues: EMPTY_ADDRESS,
	validators: { onBlur: addressSchema },
	render: ({ group }) => (
		<>
			<group.TextField
				name='street'
				label='Street'
			/>
			<group.TextField
				name='city'
				label='City'
			/>
			<group.TextField
				name='zip'
				label='ZIP'
			/>
		</>
	),
})

const BillingPart = withForm({
	defaultValues: CHECKOUT_DEFAULTS,
	render: ({ form }) => (
		<form.Section title='Billing address'>
			<form.CheckboxField
				name='separateBilling'
				label='Bill to a different address'
			/>
			<form.Subscribe selector={(state) => state.values}>
				{(values) =>
					values.separateBilling ? (
						<AddressFields
							form={form}
							fields='billing'
						/>
					) : (
						<p>Billed to {values.shipping.street || 'the shipping address'}</p>
					)
				}
			</form.Subscribe>
		</form.Section>
	),
})

export function CompositionCheckoutRulesExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={CHECKOUT_DEFAULTS}
			validationLogic={revalidateLogic()}
			validators={{ onDynamic: checkoutSchema }}
			onSubmit={({ value }) => {
				setSent({ to: 'placeOrder', value })
			}}
		>
			{(form) => (
				<>
					<form.TextField
						name='email'
						label='Email'
					/>
					<form.Section title='Shipping address'>
						<AddressFields fields='shipping' />
					</form.Section>
					<BillingPart />
					<form.FormGroup
						name='payment'
						validators={{ onChange: cardSchema }}
						onGroupSubmit={({ value }) => {
							setSent({ to: 'saveCard', value })
						}}
					>
						{(group) => (
							<form.Section title='Payment'>
								<group.TextField
									name='card'
									label='Card number'
								/>
								<group.TextField
									name='cvc'
									label='CVC'
								/>
								<Button onClick={() => void group.handleSubmit()}>Save card</Button>
							</form.Section>
						)}
					</form.FormGroup>
					<form.SubmitButton>Place order</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}
